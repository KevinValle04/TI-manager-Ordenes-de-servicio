#!/usr/bin/env python3
"""
Script Optimizado para Extracción de Cotizaciones/Órdenes de Compra
Versión optimizada SOLO con OpenAI GPT-4o-mini para máxima velocidad
Extrae TODO el texto del PDF y lo procesa en UNA SOLA llamada
para garantizar consistencia en los resultados.
"""

import pdfplumber
import PyPDF2
import sys
import os
import json
import re
import hashlib
import pickle
from datetime import datetime, timedelta
from openai import OpenAI

# Importaciones opcionales para OCR
try:
    from PIL import Image
    import io
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

# =================== FUNCIONES AUXILIARES ===================

def inicializar_cache(cache_dir):
    """Inicializa el directorio de cache si no existe"""
    if not os.path.exists(cache_dir):
        os.makedirs(cache_dir)
        print(f"📁 Cache inicializado: {cache_dir}", file=sys.stderr)
    return cache_dir

def generar_hash_texto(texto):
    """Genera un hash SHA-256 del texto para identificar documentos similares"""
    # Normalizar texto: remover espacios extra, saltos de línea múltiples
    texto_normalizado = re.sub(r'\s+', ' ', texto.strip())
    return hashlib.sha256(texto_normalizado.encode('utf-8')).hexdigest()

def generar_hash_estructura(texto):
    """Genera un hash basado en la estructura del documento (códigos, cantidades)"""
    # Extraer patrones de códigos y números para identificar documentos similares
    lineas = texto.split('\n')
    estructura = []
    
    for linea in lineas:
        # Buscar patrones de códigos (letras y números)
        codigos = re.findall(r'\b[A-Z0-9]{3,15}\b', linea)
        # Buscar números (cantidades, precios)
        numeros = re.findall(r'\b\d+(?:\.\d+)?\b', linea)
        
        if codigos or numeros:
            estructura.append(f"C{len(codigos)}N{len(numeros)}")
    
    estructura_str = '|'.join(estructura[:50])  # Limitar a primeras 50 líneas
    return hashlib.md5(estructura_str.encode('utf-8')).hexdigest()

def buscar_en_cache(hash_texto, hash_estructura, cache_dir):
    """Busca resultados similares en cache"""
    try:
        # Buscar cache exacto por texto
        cache_exacto = os.path.join(cache_dir, f"exact_{hash_texto}.json")
        if os.path.exists(cache_exacto):
            with open(cache_exacto, 'r', encoding='utf-8') as f:
                cache_data = json.load(f)
                # Verificar que no sea muy antiguo (7 días)
                fecha_cache = datetime.fromisoformat(cache_data['timestamp'])
                if datetime.now() - fecha_cache < timedelta(days=7):
                    print(f"✅ Cache exacto encontrado (edad: {datetime.now() - fecha_cache})", file=sys.stderr)
                    return cache_data['resultado'], 'exacto'
        
        # Buscar cache estructural (documentos similares)
        cache_estructura = os.path.join(cache_dir, f"struct_{hash_estructura}.json")
        if os.path.exists(cache_estructura):
            with open(cache_estructura, 'r', encoding='utf-8') as f:
                cache_data = json.load(f)
                fecha_cache = datetime.fromisoformat(cache_data['timestamp'])
                if datetime.now() - fecha_cache < timedelta(days=3):  # Menos tiempo para cache estructural
                    print(f"🔍 Cache estructural encontrado (edad: {datetime.now() - fecha_cache})", file=sys.stderr)
                    return cache_data['resultado'], 'estructural'
        
        return None, None
        
    except Exception as e:
        print(f"⚠️ Error al buscar en cache: {e}", file=sys.stderr)
        return None, None

def guardar_en_cache(hash_texto, hash_estructura, resultado, cache_dir):
    """Guarda el resultado en cache"""
    try:
        timestamp = datetime.now().isoformat()
        
        # Guardar cache exacto
        cache_exacto = os.path.join(cache_dir, f"exact_{hash_texto}.json")
        with open(cache_exacto, 'w', encoding='utf-8') as f:
            json.dump({
                'timestamp': timestamp,
                'hash_texto': hash_texto,
                'resultado': resultado
            }, f, ensure_ascii=False, indent=2)
        
        # Guardar cache estructural
        cache_estructura = os.path.join(cache_dir, f"struct_{hash_estructura}.json")
        with open(cache_estructura, 'w', encoding='utf-8') as f:
            json.dump({
                'timestamp': timestamp,
                'hash_estructura': hash_estructura,
                'resultado': resultado
            }, f, ensure_ascii=False, indent=2)
        
        print(f"💾 Resultado guardado en cache", file=sys.stderr)
        
    except Exception as e:
        print(f"⚠️ Error al guardar en cache: {e}", file=sys.stderr)

def limpiar_cache_antiguo(cache_dir):
    """Limpia archivos de cache antiguos (>30 días)"""
    try:
        now = datetime.now()
        archivos_removidos = 0
        
        for archivo in os.listdir(cache_dir):
            if archivo.endswith('.json'):
                ruta_archivo = os.path.join(cache_dir, archivo)
                fecha_modificacion = datetime.fromtimestamp(os.path.getmtime(ruta_archivo))
                
                if now - fecha_modificacion > timedelta(days=30):
                    os.remove(ruta_archivo)
                    archivos_removidos += 1
        
        if archivos_removidos > 0:
            print(f"🧹 {archivos_removidos} archivos de cache antiguos removidos", file=sys.stderr)
            
    except Exception as e:
        print(f"⚠️ Error al limpiar cache: {e}", file=sys.stderr)

def cargar_env():
    """Carga variables desde el archivo .env del proyecto"""
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                if '=' in line and not line.strip().startswith('#'):
                    key, value = line.strip().split('=', 1)
                    os.environ[key] = value
        print(f"✅ Variables cargadas desde: {env_path}", file=sys.stderr)
    else:
        print(f"⚠️  Archivo .env no encontrado en la ruta esperada.", file=sys.stderr)

def guardar_json_resultado(json_resultado, folio_original, nombre_archivo_original):
    """Guarda el resultado JSON en un archivo usando el folio como nombre."""
    try:
        directorio_resultados = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'resultados_json')
        if not os.path.exists(directorio_resultados):
            os.makedirs(directorio_resultados)
            print(f"📁 Directorio creado: {directorio_resultados}", file=sys.stderr)
        
        if folio_original and str(folio_original).strip():
            folio_limpio = re.sub(r'[<>:"/\\|?*\s]', '_', str(folio_original).strip())
            nombre_archivo = f"orden_{folio_limpio}.json"
        else:
            base_name = os.path.splitext(os.path.basename(nombre_archivo_original))[0]
            nombre_archivo = f"orden_{re.sub(r'[<>:\"/\\\\|?*\\s]', '_', base_name)}.json"
            print(f"⚠️  Sin folio, usando nombre del PDF: {nombre_archivo}", file=sys.stderr)
        
        ruta_completa = os.path.join(directorio_resultados, nombre_archivo)
        
        with open(ruta_completa, 'w', encoding='utf-8') as f:
            try:
                json_parseado = json.loads(json_resultado)
                json.dump(json_parseado, f, indent=2, ensure_ascii=False)
            except json.JSONDecodeError:
                f.write(json_resultado)
        
        print(f"💾 JSON guardado en: {ruta_completa}", file=sys.stderr)
        return ruta_completa
    except Exception as e:
        print(f"❌ Error al guardar JSON: {str(e)}", file=sys.stderr)
        return None

# =================== EXTRACCIÓN DE TEXTO OPTIMIZADA ===================

def extraer_texto_completo_pdf(archivo_pdf):
    """Extrae texto del PDF priorizando velocidad."""
    print(f"📄 Extrayendo texto de: {archivo_pdf}", file=sys.stderr)
    
    # MÉTODO 1: PyMuPDF (PRIORIDAD - más rápido)
    try:
        import fitz
        doc = fitz.open(archivo_pdf)
        texto_completo = ""
        
        for i, page in enumerate(doc, 1):
            print(f"   📄 Procesando página {i} con PyMuPDF...", file=sys.stderr)
            
            # Método 1: Extracción de texto estándar
            texto = page.get_text("text")
            if texto and texto.strip():
                print(f"      ✅ Texto estándar extraído - {len(texto)} caracteres", file=sys.stderr)
                texto_completo += f"\n=== PÁGINA {i} ===\n{texto}\n"
                continue
            
            # Método 2: Extracción con layout preservation (mejor para PDFs complejos)
            try:
                texto = page.get_text("dict")
                texto_extraido = ""
                for block in texto["blocks"]:
                    if "lines" in block:
                        for line in block["lines"]:
                            line_text = ""
                            for span in line["spans"]:
                                if "text" in span:
                                    line_text += span["text"]
                            if line_text.strip():
                                texto_extraido += line_text + "\n"
                
                if texto_extraido.strip():
                    print(f"      ✅ Texto con layout extraído - {len(texto_extraido)} caracteres", file=sys.stderr)
                    texto_completo += f"\n=== PÁGINA {i} ===\n{texto_extraido}\n"
                    continue
            except Exception as e:
                print(f"      ⚠️ Error en extracción con layout: {e}", file=sys.stderr)
            
            # Método 3: Extracción HTML (para PDFs con estructura compleja)
            try:
                texto_html = page.get_text("html")
                if texto_html:
                    # Limpiar HTML y extraer solo texto
                    import re
                    texto_limpio = re.sub(r'<[^>]+>', ' ', texto_html)
                    texto_limpio = re.sub(r'\s+', ' ', texto_limpio).strip()
                    if texto_limpio and len(texto_limpio) > 50:  # Mínimo 50 caracteres
                        print(f"      ✅ Texto HTML extraído - {len(texto_limpio)} caracteres", file=sys.stderr)
                        texto_completo += f"\n=== PÁGINA {i} ===\n{texto_limpio}\n"
                        continue
            except Exception as e:
                print(f"      ⚠️ Error en extracción HTML: {e}", file=sys.stderr)
            
            print(f"      ❌ No se pudo extraer texto de página {i} con PyMuPDF", file=sys.stderr)
        
        doc.close()
        
        if texto_completo.strip():
            print(f"✅ Extraído con PyMuPDF - {len(doc)} páginas", file=sys.stderr)
            return texto_completo
        else:
            print(f"⚠️ PyMuPDF no extrajo texto útil, continuando con pdfplumber...", file=sys.stderr)
        
    except ImportError:
        print("⚠️ PyMuPDF no disponible, usando pdfplumber...", file=sys.stderr)
    except Exception as e:
        print(f"⚠️ Error PyMuPDF: {e}, usando pdfplumber...", file=sys.stderr)
    
    # MÉTODO 2: pdfplumber (configuración rápida)
    try:
        texto_completo = ""
        with pdfplumber.open(archivo_pdf) as pdf:
            print(f"📖 PDF abierto con {len(pdf.pages)} páginas", file=sys.stderr)
            
            for i, page in enumerate(pdf.pages, 1):
                print(f"   📄 Procesando página {i}...", file=sys.stderr)
                
                # Intentar múltiples métodos de extracción
                texto = None
                
                # Método 1: Extracción estándar
                try:
                    texto = page.extract_text(x_tolerance=2, y_tolerance=2)
                    if texto and texto.strip():
                        print(f"      ✅ Método estándar exitoso - {len(texto)} caracteres", file=sys.stderr)
                except Exception as e:
                    print(f"      ⚠️ Método estándar falló: {e}", file=sys.stderr)
                
                # Método 2: Extracción con diferentes tolerancias
                if not texto or not texto.strip():
                    for x_tol, y_tol in [(0, 0), (1, 1), (3, 3), (5, 5)]:
                        try:
                            texto = page.extract_text(x_tolerance=x_tol, y_tolerance=y_tol)
                            if texto and texto.strip():
                                print(f"      ✅ Método tolerancia {x_tol},{y_tol} exitoso - {len(texto)} caracteres", file=sys.stderr)
                                break
                        except Exception as e:
                            continue
                
                # Método 3: Extracción de palabras individuales
                if not texto or not texto.strip():
                    try:
                        words = page.extract_words()
                        if words:
                            # Ordenar por posición vertical y horizontal
                            words_sorted = sorted(words, key=lambda w: (w['top'], w['x0']))
                            texto_palabras = " ".join([word['text'] for word in words_sorted])
                            if texto_palabras.strip():
                                texto = texto_palabras
                                print(f"      ✅ Extracción por palabras exitosa - {len(texto)} caracteres", file=sys.stderr)
                    except Exception as e:
                        print(f"      ⚠️ Extracción por palabras falló: {e}", file=sys.stderr)
                
                # Método 4: Extracción de caracteres individuales (para PDFs muy complejos)
                if not texto or not texto.strip():
                    try:
                        chars = page.chars
                        if chars:
                            # Agrupar caracteres por líneas
                            lines = {}
                            for char in chars:
                                if 'text' in char and char['text'].strip():
                                    y = round(char['top'], 1)  # Redondear posición vertical
                                    if y not in lines:
                                        lines[y] = []
                                    lines[y].append((char['x0'], char['text']))
                            
                            # Construir texto línea por línea
                            texto_chars = ""
                            for y in sorted(lines.keys()):
                                line_chars = sorted(lines[y], key=lambda x: x[0])  # Ordenar por posición horizontal
                                line_text = "".join([char[1] for char in line_chars])
                                if line_text.strip():
                                    texto_chars += line_text + "\n"
                            
                            if texto_chars.strip():
                                texto = texto_chars
                                print(f"      ✅ Extracción por caracteres exitosa - {len(texto)} caracteres", file=sys.stderr)
                    except Exception as e:
                        print(f"      ⚠️ Extracción por caracteres falló: {e}", file=sys.stderr)
                
                # Método 3: Extracción de tabla si otros fallan
                if not texto or not texto.strip():
                    try:
                        tables = page.extract_tables()
                        if tables:
                            texto_tabla = ""
                            for table in tables:
                                for row in table:
                                    if row:
                                        texto_tabla += " ".join([str(cell) if cell else "" for cell in row]) + "\n"
                            if texto_tabla.strip():
                                texto = texto_tabla
                                print(f"      ✅ Extracción de tabla exitosa - {len(texto)} caracteres", file=sys.stderr)
                    except Exception as e:
                        print(f"      ⚠️ Extracción de tabla falló: {e}", file=sys.stderr)
                
                # Agregar texto encontrado
                if texto and texto.strip():
                    texto_completo += f"\n=== PÁGINA {i} ===\n{texto}\n"
                    print(f"      📊 Texto agregado para página {i}", file=sys.stderr)
                else:
                    print(f"      ❌ No se pudo extraer texto de página {i}", file=sys.stderr)
            
        print(f"✅ Extraído con pdfplumber - {len(pdf.pages)} páginas procesadas", file=sys.stderr)
        print(f"📊 Total caracteres extraídos: {len(texto_completo)}", file=sys.stderr)
        
        if texto_completo.strip():
            return texto_completo
        else:
            print(f"⚠️ Texto extraído está vacío, continuando con PyPDF2...", file=sys.stderr)
                    
    except Exception as e:
        print(f"❌ Error pdfplumber: {e}. Usando PyPDF2...", file=sys.stderr)
        
    # MÉTODO 3: PyPDF2 (fallback rápido)
    try:
        print(f"🔄 Intentando con PyPDF2...", file=sys.stderr)
        texto_completo = ""
        with open(archivo_pdf, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            print(f"📖 PDF abierto con PyPDF2 - {len(pdf_reader.pages)} páginas", file=sys.stderr)
            
            for i, page in enumerate(pdf_reader.pages, 1):
                print(f"   📄 Procesando página {i} con PyPDF2...", file=sys.stderr)
                texto_pagina = page.extract_text()
                if texto_pagina and texto_pagina.strip():
                    texto_completo += f"\n=== PÁGINA {i} ===\n{texto_pagina}\n"
                    print(f"      ✅ Texto extraído - {len(texto_pagina)} caracteres", file=sys.stderr)
                else:
                    print(f"      ❌ No se pudo extraer texto de página {i}", file=sys.stderr)
        
        print(f"✅ Extraído con PyPDF2 - {len(pdf_reader.pages)} páginas procesadas", file=sys.stderr)
        print(f"📊 Total caracteres extraídos: {len(texto_completo)}", file=sys.stderr)
        
        if texto_completo.strip():
            return texto_completo
        else:
            print(f"❌ PyPDF2 no extrajo texto útil", file=sys.stderr)
            
    except Exception as e2:
        print(f"❌ Error PyPDF2: {e2}", file=sys.stderr)
    
    # MÉTODO 4: OCR básico como último recurso (solo si PIL está disponible)
    print(f"🔍 Todos los métodos de extracción estándar fallaron.", file=sys.stderr)
    if PIL_AVAILABLE:
        print(f"🔄 Intentando OCR básico como último recurso...", file=sys.stderr)
        try:
            resultado_ocr = extraer_con_ocr_basico(archivo_pdf)
            if resultado_ocr and resultado_ocr.strip():
                print(f"✅ OCR exitoso - {len(resultado_ocr)} caracteres extraídos", file=sys.stderr)
                return resultado_ocr
            else:
                print(f"❌ OCR no pudo extraer texto útil", file=sys.stderr)
        except Exception as e3:
            print(f"❌ Error OCR básico: {e3}", file=sys.stderr)
    else:
        print(f"⚠️ PIL no disponible para OCR. Instala 'pip install Pillow' para OCR básico.", file=sys.stderr)
    
    print(f"❌ Agotadas todas las opciones de extracción de texto", file=sys.stderr)
    return None

def extraer_con_ocr_basico(archivo_pdf):
    """Extrae texto usando OCR básico como último recurso"""
    try:
        import fitz
        doc = fitz.open(archivo_pdf)
        texto_completo = ""
        
        print(f"🔍 Iniciando OCR básico para {len(doc)} páginas...", file=sys.stderr)
        
        for i, page in enumerate(doc, 1):
            print(f"   📷 Procesando página {i} con OCR...", file=sys.stderr)
            
            # Convertir página a imagen
            mat = fitz.Matrix(2.0, 2.0)  # Escalar 2x para mejor calidad OCR
            pix = page.get_pixmap(matrix=mat)
            img_data = pix.tobytes("png")
            
            # Crear imagen PIL
            img = Image.open(io.BytesIO(img_data))
            
            # Intentar OCR con pytesseract si está disponible
            try:
                import pytesseract
                texto_ocr = pytesseract.image_to_string(img, lang='spa+eng')
                if texto_ocr and texto_ocr.strip():
                    texto_completo += f"\n=== PÁGINA {i} (OCR) ===\n{texto_ocr}\n"
                    print(f"      ✅ OCR exitoso - {len(texto_ocr)} caracteres", file=sys.stderr)
                else:
                    print(f"      ❌ OCR no extrajo texto de página {i}", file=sys.stderr)
            except ImportError:
                print(f"      ⚠️ pytesseract no disponible. Instala 'pip install pytesseract'", file=sys.stderr)
                break
            except Exception as e:
                print(f"      ⚠️ Error OCR en página {i}: {e}", file=sys.stderr)
        
        doc.close()
        
        if texto_completo.strip():
            print(f"✅ OCR completado - {len(texto_completo)} caracteres totales", file=sys.stderr)
            return texto_completo
        else:
            print(f"❌ OCR no pudo extraer texto", file=sys.stderr)
            return None
            
    except Exception as e:
        print(f"❌ Error en OCR básico: {e}", file=sys.stderr)
        return None

# =================== PROCESAMIENTO CON OPENAI GPT-4O-MINI ===================

def procesar_documento_con_openai(texto_completo, nombre_archivo, cache_dir):
    """Procesa el documento usando OpenAI GPT-4o-mini con sistema de cache"""
    if not texto_completo or not texto_completo.strip():
        return None

    # Generar hashes para cache
    hash_texto = generar_hash_texto(texto_completo)
    hash_estructura = generar_hash_estructura(texto_completo)
    
    print(f"🔍 Buscando en cache...", file=sys.stderr)
    print(f"   📋 Hash texto: {hash_texto[:12]}...", file=sys.stderr)
    print(f"   🏗️ Hash estructura: {hash_estructura[:12]}...", file=sys.stderr)
    
    # Buscar en cache primero
    resultado_cache, tipo_cache = buscar_en_cache(hash_texto, hash_estructura, cache_dir)
    if resultado_cache:
        print(f"⚡ CACHE HIT ({tipo_cache}) - Ahorro de ~95% tiempo y costo", file=sys.stderr)
        
        # Si es cache estructural, actualizar folio y fecha
        if tipo_cache == 'estructural':
            try:
                resultado_json = json.loads(resultado_cache)
                
                # Extraer folio actual del texto
                folio_match = re.search(r'(?:FOLIO|ORDEN|COTIZACIÓN|QUOTE)[:\s]*([A-Z0-9]+)', texto_completo, re.IGNORECASE)
                if folio_match:
                    resultado_json['folioOriginal'] = folio_match.group(1)
                
                # Extraer fecha actual del texto
                fecha_match = re.search(r'(\d{1,2}[/-]\d{1,2}[/-]\d{4})', texto_completo)
                if fecha_match:
                    from datetime import datetime
                    try:
                        fecha_str = fecha_match.group(1)
                        if '/' in fecha_str:
                            fecha_obj = datetime.strptime(fecha_str, '%d/%m/%Y')
                        else:
                            fecha_obj = datetime.strptime(fecha_str, '%d-%m-%Y')
                        resultado_json['fecha'] = fecha_obj.strftime('%Y-%m-%d')
                    except:
                        pass
                
                resultado_cache = json.dumps(resultado_json, ensure_ascii=False)
                print(f"🔄 Resultado de cache estructural actualizado con folio/fecha actual", file=sys.stderr)
            except:
                print(f"⚠️ Error actualizando cache estructural, usando como está", file=sys.stderr)
        
        return resultado_cache

    print(f"🤖 No encontrado en cache, procesando con OpenAI GPT-4o-mini...", file=sys.stderr)
    
    # Verificar longitud del texto
    num_tokens = len(texto_completo) // 4  # Aproximación
    if num_tokens > 120000:  # Límite para GPT-4o-mini
        print(f"⚠️ Advertencia: El texto es muy largo ({num_tokens} tokens aprox). Truncando...", file=sys.stderr)
        texto_completo = texto_completo[:480000]  # ~120k tokens
    
    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        print("❌ ERROR: Variable de entorno OPENAI_API_KEY no encontrada", file=sys.stderr)
        print("   Asegúrate de tener OPENAI_API_KEY en tu archivo .env", file=sys.stderr)
        return None

    client = OpenAI(
        api_key=api_key,
        timeout=120.0,  # Reducido a 2 minutos
        max_retries=2   # Reducido a 2 intentos para mayor velocidad
    )

    # Prompt ultra-optimizado para velocidad (sin proveedor/cliente)
    prompt_consolidado = f"""Extrae datos del documento "{nombre_archivo}" en JSON:

{{
  "folioOriginal": "string",
  "fecha": "YYYY-MM-DD",
  "productos": [{{
    "linea": number,
    "codigo": "string",
    "descripcion": "string", 
    "cantidad": number,
    "unidad": "string",
    "precioUnitario": number,
    "descuento": 0,
    "importe": number
  }}],
  "totales": {{"subtotal": number, "iva": number, "total": number}},
  "moneda": "string",
  "condiciones": "string|null"
}}

REGLAS: Cada línea física = 1 producto. NO deduplicar. Extraer EXACTO como aparece.

DOCUMENTO:
{texto_completo}"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # Modelo más rápido y económico
            messages=[
                {"role": "user", "content": prompt_consolidado}
            ],
            temperature=0.0,    # Sin variabilidad para máxima velocidad
            max_tokens=8192,    # Reducido para respuestas más rápidas
            timeout=120,        # Timeout de 2 minutos
            stream=False        # Sin streaming para simplicidad
        )
        resultado_str = response.choices[0].message.content
        
        # Extraer JSON limpio y verificar que está completo
        json_start_index = -1
        first_brace = resultado_str.find('{')
        
        if first_brace != -1:
            # Asegurarnos de que el JSON está balanceado
            stack = []
            in_string = False
            escape_char = False
            valid_json = False
            
            for i, char in enumerate(resultado_str[first_brace:], first_brace):
                if escape_char:
                    escape_char = False
                    continue
                    
                if char == '\\':
                    escape_char = True
                    continue
                    
                if char == '"' and not escape_char:
                    in_string = not in_string
                    continue
                    
                if not in_string:
                    if char == '{':
                        stack.append(char)
                    elif char == '}':
                        if stack:
                            stack.pop()
                            if not stack:  # JSON balanceado encontrado
                                resultado_str = resultado_str[first_brace:i + 1]
                                valid_json = True
                                break
                                
            if not valid_json:
                raise json.JSONDecodeError("JSON incompleto o mal formado", resultado_str, 0)

        # Validar JSON y verificar estructura
        json_parseado = json.loads(resultado_str)
        print(f"   ✓ Documento analizado por OpenAI GPT-4o-mini.", file=sys.stderr)
        
        # Validar que se extrajeron productos y verificar estructura
        productos = json_parseado.get('productos', [])
        num_productos = len(productos)
        print(f"   📊 Productos extraídos: {num_productos}", file=sys.stderr)
        
        # Validación detallada de productos
        codigos_vistos = {}
        for i, producto in enumerate(productos, 1):
            codigo = producto.get('codigo', '')
            if codigo in codigos_vistos:
                codigos_vistos[codigo] += 1
                print(f"      🔄 Producto repetido encontrado: {codigo} (aparición #{codigos_vistos[codigo]})", file=sys.stderr)
            else:
                codigos_vistos[codigo] = 1
        
        # Mostrar resumen de duplicados
        duplicados = {k: v for k, v in codigos_vistos.items() if v > 1}
        if duplicados:
            print("   📊 Resumen de productos duplicados:", file=sys.stderr)
            for codigo, cantidad in duplicados.items():
                print(f"      - {codigo}: aparece {cantidad} veces", file=sys.stderr)
        
        # Validación específica para este tipo de documento
        if num_productos < 25:  # Basado en el PDF, debería haber más de 25 productos
            print(f"⚠️  ADVERTENCIA: Solo se extrajeron {num_productos} productos. El documento parece tener más.", file=sys.stderr)
        
        # Mostrar costo aproximado
        tokens_aprox = len(texto_completo) // 4  # Aproximación
        costo_aprox = (tokens_aprox / 1000000) * 0.15  # $0.15 por 1M tokens input
        print(f"   💰 Costo aproximado: ${costo_aprox:.4f} USD", file=sys.stderr)
        
        # Guardar en cache para futuras consultas
        guardar_en_cache(hash_texto, hash_estructura, resultado_str, cache_dir)
        
        return resultado_str
        
    except json.JSONDecodeError as e:
        print(f"❌ Error: Respuesta no es JSON válido: {e}", file=sys.stderr)
        print(f"Respuesta recibida: {resultado_str[:500]}...", file=sys.stderr)
        return None
        
    except Exception as e:
        print(f"❌ Error procesando con OpenAI GPT-4o-mini: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        return None

# =================== ENTRADA PRINCIPAL ===================

if __name__ == "__main__":
    cargar_env()
    
    if len(sys.argv) != 2:
        print("❌ ERROR: Se requiere la ruta del archivo PDF como argumento.", file=sys.stderr)
        print("Uso: python extraer_datos_universal_openia.py <archivo_pdf>", file=sys.stderr)
        sys.exit(1)
    
    archivo_pdf = sys.argv[1]
    if not os.path.exists(archivo_pdf):
        print(f"❌ Error: El archivo {archivo_pdf} no existe.", file=sys.stderr)
        sys.exit(1)
    
    try:
        print(f"🚀 Iniciando procesamiento optimizado con OpenAI GPT-4o-mini", file=sys.stderr)
        
        # Inicializar directorio de cache
        cache_dir = os.path.join(os.path.dirname(archivo_pdf), '..', 'cache')
        inicializar_cache(cache_dir)
        
        # PASO 1: Extraer TODO el texto del PDF (con métodos optimizados)
        texto_completo = extraer_texto_completo_pdf(archivo_pdf)
        if not texto_completo or not texto_completo.strip():
            print("❌ No se pudo extraer texto del PDF con ningún método disponible.", file=sys.stderr)
            print("   El PDF puede ser una imagen escaneada que requiere OCR avanzado.", file=sys.stderr)
            print("   Considera convertir el PDF a texto o usar un formato más compatible.", file=sys.stderr)
            sys.exit(1)
        
        # Imprimir información sobre el tamaño del texto
        num_caracteres = len(texto_completo)
        num_tokens_aprox = num_caracteres // 4
        print(f"📊 Tamaño del texto extraído: {num_caracteres} caracteres ({num_tokens_aprox} tokens aprox.)", file=sys.stderr)
        
        # Validación adicional: verificar que el texto contiene información útil
        if num_caracteres < 100:
            print(f"⚠️ El texto extraído es muy corto ({num_caracteres} caracteres). Puede no ser suficiente.", file=sys.stderr)
        
        # Verificar que contiene patrones típicos de órdenes/cotizaciones
        patrones_importantes = [
            r'\d+',  # Números
            r'[A-Z]{2,}',  # Códigos en mayúsculas
            r'(?i)(precio|total|cantidad|codigo|descripcion|producto)',  # Palabras clave
        ]
        
        patrones_encontrados = 0
        for patron in patrones_importantes:
            if re.search(patron, texto_completo):
                patrones_encontrados += 1
        
        print(f"🔍 Patrones de documento comercial encontrados: {patrones_encontrados}/{len(patrones_importantes)}", file=sys.stderr)
        
        if patrones_encontrados < 2:
            print(f"⚠️ El documento puede no contener información comercial típica.", file=sys.stderr)
        
        # Mostrar una muestra del texto extraído para debugging
        muestra_texto = texto_completo[:500].replace('\n', '\\n')
        print(f"📄 Muestra del texto extraído:", file=sys.stderr)
        print(f"   {muestra_texto}...", file=sys.stderr)

        # PASO 2: Procesar el documento completo SOLO con OpenAI
        json_resultado = procesar_documento_con_openai(texto_completo, os.path.basename(archivo_pdf), cache_dir)
        
        if not json_resultado:
            print("❌ El procesamiento con OpenAI no arrojó resultados válidos.", file=sys.stderr)
            sys.exit(1)

        # PASO 3: Mostrar y guardar el resultado final
        print(json_resultado)  # Imprimir en stdout para el sistema
        
        folio_extraido = None
        try:
            json_final_parseado = json.loads(json_resultado)
            folio_extraido = json_final_parseado.get('folioOriginal')
            num_productos = len(json_final_parseado.get('productos', []))
            print(f"📋 Folio detectado: {folio_extraido}", file=sys.stderr)
            print(f"📊 Total de productos extraídos: {num_productos}", file=sys.stderr)
            
            # Validación mejorada específica para este documento
            if num_productos == 0:
                print(f"⚠️  ADVERTENCIA: No se extrajeron productos. Verifica el documento.", file=sys.stderr)
            elif num_productos < 25:
                print(f"⚠️  ADVERTENCIA: Solo {num_productos} productos extraídos. El documento parece tener más productos.", file=sys.stderr)
            else:
                print(f"✅ Extracción exitosa: {num_productos} productos procesados", file=sys.stderr)
                
            # Verificar productos sin precio
            productos_sin_precio = [p for p in json_final_parseado.get('productos', []) if p.get('precioUnitario', 0) == 0]
            if productos_sin_precio:
                print(f"📝 Productos sin precio detectados: {len(productos_sin_precio)}", file=sys.stderr)
                
        except Exception as e:
            print(f"⚠️  Error al parsear JSON final: {e}", file=sys.stderr)

        archivo_guardado = guardar_json_resultado(
            json_resultado, 
            folio_extraido, 
            os.path.basename(archivo_pdf)
        )

        if archivo_guardado:
            print(f"✅ Proceso completado exitosamente con OpenAI GPT-4o-mini.", file=sys.stderr)
            print(f"⚡ Procesamiento optimizado completado", file=sys.stderr)
    
    except Exception as e:
        error_message = f"❌ ERROR CRÍTICO EN EL PROCESO: {str(e)}"
        print(error_message, file=sys.stderr)
        print("\nDetalles del error:", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        
        error_json = {
            "error": error_message,
            "details": str(e)
        }
        print(json.dumps(error_json))
        sys.exit(1)