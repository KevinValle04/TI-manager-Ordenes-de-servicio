#!/usr/bin/env python3
"""
Script Optimizado para Extracción de Cotizaciones/Órdenes de Compra
Modelo: OpenAI GPT-4o para MÁXIMA VELOCIDAD Y PRECISIÓN
Extrae TODO el texto del PDF y lo procesa en UNA SOLA llamada
para garantizar consistencia en los resultados.
"""

import sys
import os
import json
import re
import hashlib
from datetime import datetime, timedelta
from openai import OpenAI

# Importaciones para extracción de texto
try:
    import fitz  # PyMuPDF
    PYMUPDF_AVAILABLE = True
except ImportError:
    PYMUPDF_AVAILABLE = False

try:
    import pdfplumber
    PDFPLUMBER_AVAILABLE = True
except ImportError:
    PDFPLUMBER_AVAILABLE = False

import PyPDF2

# =================== FUNCIONES AUXILIARES ===================

def inicializar_cache(cache_dir):
    """Inicializa el directorio de cache si no existe"""
    if not os.path.exists(cache_dir):
        os.makedirs(cache_dir)
        print(f"📁 Directorio de cache creado: {cache_dir}", file=sys.stderr)
    return cache_dir

def generar_hash_texto(texto):
    """Genera un hash SHA-256 del texto para identificar documentos similares"""
    texto_normalizado = re.sub(r'\s+', ' ', texto.strip())
    return hashlib.sha256(texto_normalizado.encode('utf-8')).hexdigest()

def generar_hash_estructura(texto):
    """Genera un hash basado en la estructura del documento (códigos, cantidades)"""
    lineas = texto.split('\n')
    estructura = []
    for linea in lineas:
        codigos = re.findall(r'\b[A-Z0-9]{3,15}\b', linea)
        numeros = re.findall(r'\b\d+(?:\.\d+)?\b', linea)
        if codigos or numeros:
            estructura.append(f"C{len(codigos)}N{len(numeros)}")
    estructura_str = '|'.join(estructura[:50])
    return hashlib.md5(estructura_str.encode('utf-8')).hexdigest()

def buscar_en_cache(hash_texto, hash_estructura, cache_dir):
    """Busca resultados similares en cache"""
    try:
        cache_exacto = os.path.join(cache_dir, f"exact_{hash_texto}.json")
        if os.path.exists(cache_exacto):
            with open(cache_exacto, 'r', encoding='utf-8') as f:
                cache_data = json.load(f)
                fecha_cache = datetime.fromisoformat(cache_data['timestamp'])
                if datetime.now() - fecha_cache < timedelta(days=7):
                    print(f"✅ Cache exacto encontrado.", file=sys.stderr)
                    return cache_data['resultado'], 'exacto'
        
        cache_estructura = os.path.join(cache_dir, f"struct_{hash_estructura}.json")
        if os.path.exists(cache_estructura):
            with open(cache_estructura, 'r', encoding='utf-8') as f:
                cache_data = json.load(f)
                fecha_cache = datetime.fromisoformat(cache_data['timestamp'])
                if datetime.now() - fecha_cache < timedelta(days=3):
                    print(f"🔍 Cache estructural encontrado.", file=sys.stderr)
                    return cache_data['resultado'], 'estructural'
        return None, None
    except Exception as e:
        print(f"⚠️ Error al buscar en cache: {e}", file=sys.stderr)
        return None, None

def guardar_en_cache(hash_texto, hash_estructura, resultado, cache_dir):
    """Guarda el resultado en cache"""
    try:
        timestamp = datetime.now().isoformat()
        cache_data = {'timestamp': timestamp, 'resultado': resultado}
        
        cache_exacto = os.path.join(cache_dir, f"exact_{hash_texto}.json")
        with open(cache_exacto, 'w', encoding='utf-8') as f:
            json.dump({'hash_texto': hash_texto, **cache_data}, f, ensure_ascii=False, indent=2)
        
        cache_estructura = os.path.join(cache_dir, f"struct_{hash_estructura}.json")
        with open(cache_estructura, 'w', encoding='utf-8') as f:
            json.dump({'hash_estructura': hash_estructura, **cache_data}, f, ensure_ascii=False, indent=2)
        
        print(f"💾 Resultado guardado en cache", file=sys.stderr)
    except Exception as e:
        print(f"⚠️ Error al guardar en cache: {e}", file=sys.stderr)

def procesar_guiones_syscom(texto):
    """
    Reemplaza patrones comunes de códigos Syscom que usan guiones (ej: "TIJ -- -- -- --")
    por una versión con ceros en lugar de los guiones dobles, para que los códigos
    mantengan longitud y sean detectables por los parsers.

    Reglas implementadas:
    - Reemplaza cada ocurrencia de "--" por "00"
    - Remueve espacios entre el prefijo y los bloques de ceros resultantes
    - Aplica sólo a patrones donde aparece una abreviatura al inicio seguida de guiones
    """
    if not texto:
        return texto

    # Primero, combinamos líneas donde el prefijo (ej: TIJ) está en una línea
    # y las siguientes contienen "--" en líneas separadas. Esto ocurre en
    # muchos PDFs donde los guiones se colocan en líneas separadas.
    lines = texto.splitlines()
    out_lines = []
    i = 0
    while i < len(lines):
        line = lines[i]
        m = re.match(r"^\s*([A-Z]{2,6})\s*$", line)
        if m:
            prefix = m.group(1)
            j = i + 1
            dash_count = 0
            # Contar cuántas líneas siguientes contienen guiones "--"
            while j < len(lines):
                s = lines[j].strip()
                if not s:
                    break
                # Considerar líneas que contengan uno o más "--" tokens
                if '--' in s:
                    # contar cuántas apariciones de "--" hay en la línea
                    dash_count += s.count('--')
                    j += 1
                    continue
                else:
                    break

            if dash_count > 0:
                # Reconstruir una línea compacta tipo: "TIJ -- -- -- --"
                combined = prefix + ' ' + ' '.join(['--'] * dash_count)
                out_lines.append(combined)
                i = j
                continue

        out_lines.append(line)
        i += 1

    texto_comb = '\n'.join(out_lines)

    # Ahora reemplazar los tokens "--" por "00"
    texto_replaced = re.sub(r"--", "00", texto_comb)

    # Colapsar espacios internos en tokens que tengan prefijo de letras seguido de ceros
    # Ej: "TIJ 00 00 00" -> "TIJ000000"
    def _collapse(m):
        return re.sub(r"\s+", "", m.group(0))

    texto_final = re.sub(r"\b[A-Z]{2,6}(?:\s+0)+\b", _collapse, texto_replaced)
    return texto_final

def cargar_env():
    """Carga variables desde un archivo .env en la raíz del proyecto"""
    try:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        env_path = os.path.join(script_dir, '..', '.env')
        if os.path.exists(env_path):
            with open(env_path, 'r', encoding='utf-8') as f:
                for line in f:
                    if '=' in line and not line.strip().startswith('#'):
                        key, value = line.strip().split('=', 1)
                        os.environ[key] = value.strip()
            print(f"✅ Variables de entorno cargadas.", file=sys.stderr)
        else:
            print(f"⚠️ Archivo .env no encontrado en la ruta esperada.", file=sys.stderr)
    except Exception as e:
        print(f"⚠️ Error cargando .env: {e}", file=sys.stderr)

def guardar_json_resultado(json_resultado, folio_original, nombre_archivo_original):
    """Guarda el resultado JSON en un archivo."""
    try:
        directorio_resultados = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'resultados_json')
        if not os.path.exists(directorio_resultados):
            os.makedirs(directorio_resultados)
        
        if folio_original and str(folio_original).strip():
            folio_limpio = re.sub(r'[<>:"/\\|?*\s]', '_', str(folio_original).strip())
            nombre_archivo = f"orden_{folio_limpio}.json"
        else:
            base_name = os.path.splitext(os.path.basename(nombre_archivo_original))[0]
            nombre_archivo = f"orden_{re.sub(r'[^a-zA-Z0-9_-]', '_', base_name)}.json"
            print(f"⚠️ Sin folio, usando nombre del PDF: {nombre_archivo}", file=sys.stderr)
        
        ruta_completa = os.path.join(directorio_resultados, nombre_archivo)
        
        with open(ruta_completa, 'w', encoding='utf-8') as f:
            json_obj = json.loads(json_resultado)
            json.dump(json_obj, f, indent=2, ensure_ascii=False)
        
        print(f"💾 JSON guardado en: {ruta_completa}", file=sys.stderr)
        return ruta_completa
    except (Exception, json.JSONDecodeError) as e:
        print(f"❌ Error al guardar JSON: {str(e)}", file=sys.stderr)
        return None

# =================== EXTRACCIÓN DE TEXTO ===================

def es_pdf_escaneado(archivo_pdf):
    """Detecta si un PDF parece ser escaneo combinando imágenes grandes + falta de texto."""
    try:
        if PYMUPDF_AVAILABLE:
            doc = fitz.open(archivo_pdf)
            for page in doc:
                # Extraer texto
                texto = page.get_text().strip()
                tiene_texto = bool(texto)

                # Obtener imágenes
                image_list = page.get_images()
                imagen_grande = False

                for img in image_list:
                    xref = img[0]
                    imagen = doc.extract_image(xref)
                    if imagen:
                        image_size = imagen["width"] * imagen["height"]
                        page_size = page.rect.width * page.rect.height
                        if image_size > 0.7 * page_size:
                            imagen_grande = True
                            break

                # Nueva regla: solo escaneado si NO hay texto + imagen grande
                if imagen_grande and not tiene_texto:
                    doc.close()
                    return True
            
            doc.close()
    except Exception as e:
        print(f"⚠️ Error al detectar escaneo: {e}", file=sys.stderr)

    return False

def extraer_texto_completo_pdf(archivo_pdf):
    """Extrae texto del PDF usando los métodos más rápidos y efectivos primero."""
    # Primero verificar si es un escaneo
    if es_pdf_escaneado(archivo_pdf):
        print("❌ El PDF parece ser un escaneo (imagen).", file=sys.stderr)
        raise ValueError("PDF_ESCANEADO: El archivo parece ser un PDF escaneado (imagen). Por favor, sube un PDF que contenga texto real y no imágenes escaneadas.")

    texto_completo = ""
    print(f"📄 Extrayendo texto de: {os.path.basename(archivo_pdf)}", file=sys.stderr)

    # MÉTODO 1: PyMuPDF (fitz) - Rápido y preciso
    if PYMUPDF_AVAILABLE:
        try:
            doc = fitz.open(archivo_pdf)
            for i, page in enumerate(doc, 1):
                texto_pagina = page.get_text("text", sort=True)
                if texto_pagina and texto_pagina.strip():
                    texto_completo += f"\n=== PÁGINA {i} ===\n{texto_pagina}\n"
            doc.close()
            if texto_completo.strip():
                print(f"✅ Texto extraído con PyMuPDF.", file=sys.stderr)
                return texto_completo
        except Exception as e:
            print(f"⚠️ Error con PyMuPDF: {e}. Intentando otros métodos...", file=sys.stderr)

    # MÉTODO 2: pdfplumber - Bueno para tablas
    if PDFPLUMBER_AVAILABLE:
        try:
            texto_completo = ""
            with pdfplumber.open(archivo_pdf) as pdf:
                for i, page in enumerate(pdf.pages, 1):
                    texto_pagina = page.extract_text(x_tolerance=2, y_tolerance=2)
                    if texto_pagina and texto_pagina.strip():
                         texto_completo += f"\n=== PÁGINA {i} ===\n{texto_pagina}\n"
            if texto_completo.strip():
                print(f"✅ Texto extraído con pdfplumber.", file=sys.stderr)
                return texto_completo
        except Exception as e:
            print(f"⚠️ Error con pdfplumber: {e}. Intentando PyPDF2...", file=sys.stderr)

    # MÉTODO 3: PyPDF2 - Fallback
    try:
        texto_completo = ""
        with open(archivo_pdf, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            for i, page in enumerate(pdf_reader.pages, 1):
                texto_pagina = page.extract_text()
                if texto_pagina and texto_pagina.strip():
                    texto_completo += f"\n=== PÁGINA {i} ===\n{texto_pagina}\n"
        if texto_completo.strip():
            print(f"✅ Texto extraído con PyPDF2.", file=sys.stderr)
            return texto_completo
    except Exception as e:
        print(f"❌ Error con PyPDF2: {e}", file=sys.stderr)
    
    print(f"❌ No se pudo extraer texto del PDF con ningún método.", file=sys.stderr)
    return None

def procesar_documento_con_openai(texto_completo, nombre_archivo, cache_dir):
    """Procesa el documento usando OpenAI GPT-4o para máxima velocidad y precisión."""
    print(f"🔍 DEBUG: Iniciando procesamiento con OpenAI", file=sys.stderr)
    
    if not texto_completo or not texto_completo.strip():
        print("❌ ERROR: Texto completo está vacío", file=sys.stderr)
        return None

    # Obtener la API key de las variables de entorno
    api_key = os.environ.get('OPENAI_API_KEY')
    print(f"🔍 DEBUG: API Key presente: {bool(api_key)}", file=sys.stderr)
    
    if not api_key:
        print("❌ ERROR: Variable de entorno OPENAI_API_KEY no encontrada.", file=sys.stderr)
        print(f"🔍 DEBUG: Variables disponibles: {list(os.environ.keys())[:10]}...", file=sys.stderr)
        return None

    # Generar hashes para cache
    hash_texto = generar_hash_texto(texto_completo)
    hash_estructura = generar_hash_estructura(texto_completo)
    
    # Buscar en cache - DESACTIVADO PARA PRUEBAS
    # resultado_cache, tipo_cache = buscar_en_cache(hash_texto, hash_estructura, cache_dir)
    # if resultado_cache:
    #     print(f"🎯 Resultado obtenido desde cache ({tipo_cache})", file=sys.stderr)
    #     return resultado_cache

    print(f"🔍 DEBUG: Creando cliente OpenAI", file=sys.stderr)
    try:
        client = OpenAI(api_key=api_key, timeout=120.0, max_retries=2)
        print(f"✅ DEBUG: Cliente OpenAI creado exitosamente", file=sys.stderr)
    except Exception as e:
        print(f"❌ ERROR: No se pudo crear cliente OpenAI: {e}", file=sys.stderr)
        return None

    prompt_consolidado = f"""Extrae los datos del siguiente documento de cotización en un formato JSON estructurado.

**Esquema JSON Requerido (FLEXIBLE para diferentes proveedores):**
{{
  "folioOriginal": "string",
  "fecha": "YYYY-MM-DD",
  "productos": [{{
    "linea": "number (debe ser un contador secuencial iniciando en 1)",
    "codigo": "string",
    "descripcion": "string",
    "cantidad": "number",
    "unidad": "string",
    "precioUnitario": "number", // PRIORITARIO: Precio unitario directo (para SYSCOM, TVC, etc.)
    "precioListaUnitario": "number", // OPCIONAL: Precio lista antes de descuento (para GRUPO DICE)
    "descuentoPorcentaje": "number", // OPCIONAL: Descuento en porcentaje (solo si existe explícitamente)
    "precioUnitarioFinal": "number", // OPCIONAL: Precio después del descuento (calculado)
    "importe": "number" // OBLIGATORIO: Total de la línea
  }}],
  "totales": {{"subtotal": "number", "iva": "number", "total": "number"}},
  "moneda": "string (Detecta la moneda, si no se especifica, asume 'MXN')"
}}

**IMPORTANTE - EXTRACCIÓN DE DATOS:**
- Extrae los productos con sus precios exactos del documento
- Para los totales, usa los valores que aparecen en el PDF (el modal los recalculará si es necesario)
- Enfócate en la precisión de los datos de productos y precios

**REGLAS CRÍTICAS PARA EXTRACCIÓN FLEXIBLE:**
1.  **DETECCIÓN AUTOMÁTICA DEL FORMATO:**
    * Si el documento tiene columna "PRECIO LISTA" y "DESCUENTO" → usar `precioListaUnitario` + `descuentoPorcentaje`
    * Si el documento solo tiene "PRECIO UNITARIO" o "P.U." → usar `precioUnitario` directamente
    * **ESPECIAL PORTENTUM**: Si existe "PRECIO COSTO" → usar como `precioUnitario` (precio real de venta)
    * **ESPECIAL ARUBA**: Si existe "P.U. Canal" → usar como `precioUnitario` + usar "P. Extendido" como `importe`
    * **IMPORTANTE**: Para Portentum, IGNORAR columnas "Precio Unitario" si existe "Precio costo"
    * **IMPORTANTE**: Para Aruba, IGNORAR columnas "Precio Lista" y usar "P.U. Canal"
    * SIEMPRE extraer `importe` de la última columna de totales

**EJEMPLO ESPECÍFICO PORTENTUM:**
Si ves esta estructura en el documento:
- Precio lista: 1,415.6200
- % Dto.: 43.50  
- Precio costo: 799.8300
- Precio Unitario: 1415

DEBES USAR:
- precioUnitario = 799.8300 (desde "Precio costo")
- precioListaUnitario = 1415.6200 (desde "Precio lista") 
- descuentoPorcentaje = 0 (PORTENTUM no usa descuentos, precio costo ya es final)
- IGNORAR completamente el valor "1415" de la columna "Precio Unitario"

**EJEMPLO ESPECÍFICO ARUBA:**
Si ves esta estructura en el documento:
- Precio Lista: 44,260.00
- P.U. Canal: 13,730.56
- P. Extendido: 27,527.11

DEBES USAR:
- precioUnitario = 13730.56 (desde "P.U. Canal")
- precioListaUnitario = 44260.00 (desde "Precio Lista")
- importe = 27527.11 (desde "P. Extendido")
- descuentoPorcentaje = 0 (precio canal ya es final)

2.  **MAPEO DE CAMPOS POR PROVEEDOR:**
    * **TVC**: `precioUnitario` desde "PRECIO DISTRIBUIDOR" (sin descuentos, descuento = 0)
    * **SYSCOM**: `precioUnitario` desde "P.U." o "PRECIO UNITARIO" (YA incluye descuentos, descuento = 0)
    * **GRUPO DICE**: `precioListaUnitario` desde "PRECIO LISTA UNIT." + `descuentoPorcentaje` desde "DESCUENTO"
    * **PORTENTUM**: `precioUnitario` desde "PRECIO COSTO" o "Precio costo" (NUNCA desde "Precio Unitario") + `precioListaUnitario` desde "PRECIO LISTA" + `descuentoPorcentaje` = 0 (sin descuentos)
    * **ARUBA**: `precioUnitario` desde "P.U. Canal" + `importe` desde "P. Extendido" + `descuentoPorcentaje` = 0 (sin descuentos)
    * **UNIVERSAL**: `precioUnitario` desde cualquier columna de precio unitario

4.  **PRIORIDAD DE EXTRACCIÓN:**
    * **Para TVC**: `precioUnitario` → "PRECIO DISTRIBUIDOR" (descuento automático = 0)
    * **Para SYSCOM**: `precioUnitario` → "P.U." o "PRECIO UNITARIO" (descuento automático = 0, precios YA incluyen descuentos)
    * **Para PORTENTUM**: `precioUnitario` → "PRECIO COSTO" o "Precio costo" (descuento = 0, precio final)
    * **Para ARUBA**: `precioUnitario` → "P.U. Canal" + `importe` → "P. Extendido" (descuento = 0)
    * **Para otros**: `precioUnitario` → Buscar en: "P.U.", "PRECIO UNITARIO", "PRECIO UNIT.", "UNIT PRICE"
    * `precioListaUnitario` → Buscar en: "PRECIO LISTA", "LISTA UNIT.", "PRICE LIST"
    * `descuentoPorcentaje` → Buscar en: "DESCUENTO", "DESC %", "DISCOUNT" (excepto TVC, SYSCOM, PORTENTUM y ARUBA = 0)
    * `importe` → Buscar en: "IMPORTE", "TOTAL", "PRECIO EXTENDIDO", "P. EXTENDIDO", "EXTENDED PRICE"

5.  **EXTRACCIÓN PRECISA:**
    * Extrae `precioUnitario` tal como aparece en el documento
    * Si hay `precioListaUnitario` y `descuentoPorcentaje`, extrae ambos valores
    * `importe` debe ser el valor exacto que aparece en el documento
    * Los cálculos y validaciones se harán en el frontend (modal)

6.  **REGLA ESPECIAL PARA PROVEEDORES ESPECÍFICOS:**
    * **TVC**: SIEMPRE buscar la columna "PRECIO DISTRIBUIDOR" o "PRECIO DISTRIBU."
    * **SYSCOM**: SIEMPRE buscar la columna "P.U." o "PRECIO UNITARIO"
    * **PORTENTUM**: SIEMPRE buscar la columna "PRECIO COSTO" o "Precio costo" (NUNCA usar "Precio Unitario")
    * **ARUBA**: SIEMPRE buscar la columna "P.U. Canal" para precio unitario y "P. Extendido" para importe
    * **PRIORIDAD ABSOLUTA PORTENTUM**: Si encuentras "Precio costo" = 799.83 y "Precio Unitario" = 1415, USA 799.83
    * **PRIORIDAD ABSOLUTA ARUBA**: Si encuentras "P.U. Canal" = 13730.56 y "Precio Lista" = 44260.00, USA 13730.56
    * Usar ese valor como `precioUnitario` final
    * Para TVC, SYSCOM, PORTENTUM y ARUBA: NUNCA aplicar descuentos adicionales (descuento = 0)
    * Para PORTENTUM: El "PRECIO COSTO" ya es el precio final, sin descuentos adicionales
    * Para ARUBA: El "P.U. Canal" ya es el precio final de canal, sin descuentos adicionales
    * **REGLA CRÍTICA PORTENTUM**: Si hay múltiples columnas de precio (ej: "Precio Unitario" y "Precio costo"), SIEMPRE usar "Precio costo" como precioUnitario
    * **REGLA CRÍTICA ARUBA**: Si hay múltiples columnas de precio (ej: "Precio Lista" y "P.U. Canal"), SIEMPRE usar "P.U. Canal" como precioUnitario

**DOCUMENTO A PROCESAR:**
(Nombre del archivo: {nombre_archivo})

**INSTRUCCIÓN FINAL CRÍTICA:**
Si el documento contiene las columnas "Precio costo" Y "Precio Unitario", debes usar SOLAMENTE el valor de "Precio costo" como precioUnitario en el JSON final. El valor de "Precio Unitario" debe ser completamente ignorado. Esta es una regla ABSOLUTA e inviolable para documentos Portentum.

Si el documento contiene las columnas "P.U. Canal" Y "Precio Lista", debes usar SOLAMENTE el valor de "P.U. Canal" como precioUnitario en el JSON final. Además, usar "P. Extendido" como importe directo. Esta es una regla ABSOLUTA e inviolable para documentos Aruba.

**PRIORIDAD: EXTRACCIÓN PRECISA SOBRE CÁLCULOS**
- Enfócate en extraer los datos exactos del documento
- No te preocupes por validar cálculos matemáticos
- El frontend (modal) se encargará de todos los cálculos y recálculos
- Tu trabajo es ser un extractor de datos preciso y confiable

---
{texto_completo}
---
"""

    print(f"🔍 DEBUG: Enviando request a OpenAI con {len(texto_completo)} caracteres", file=sys.stderr)
    try:
        response = client.chat.completions.create(
            # ==============================================================
            # ========= CAMBIO DE MODELO PARA MÁXIMA VELOCIDAD Y PRECISIÓN ====
            # ==============================================================
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt_consolidado}],
            temperature=0.0,
            max_tokens=8192,
            response_format={"type": "json_object"}
        )
        print(f"✅ DEBUG: Respuesta recibida de OpenAI", file=sys.stderr)
        
        resultado_str = response.choices[0].message.content
        print(f"🔍 DEBUG: Longitud de respuesta: {len(resultado_str) if resultado_str else 0}", file=sys.stderr)
        
        # Validación básica del JSON
        json_parseado = json.loads(resultado_str)
        if 'productos' not in json_parseado or 'totales' not in json_parseado:
            raise ValueError("El JSON no contiene los campos requeridos 'productos' o 'totales'.")

        print(f"   ✓ Documento analizado por GPT-4o.", file=sys.stderr)
        print(f"   📊 Productos extraídos: {len(json_parseado.get('productos', []))}", file=sys.stderr)
        
        # guardar_en_cache(hash_texto, hash_estructura, resultado_str, cache_dir) # DESACTIVADO PARA PRUEBAS
        return resultado_str
        
    except Exception as e:
        print(f"❌ Error procesando con OpenAI: {e}", file=sys.stderr)
        import traceback
        print(f"🔍 DEBUG: Traceback completo:", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        return None

# =================== ENTRADA PRINCIPAL ===================

if __name__ == "__main__":
    cargar_env()
    
    if len(sys.argv) != 2:
        print("Uso: python tu_script.py <ruta_del_pdf>", file=sys.stderr)
        sys.exit(1)
    
    archivo_pdf = sys.argv[1]
    if not os.path.exists(archivo_pdf):
        print(f"❌ Error: El archivo {archivo_pdf} no existe.", file=sys.stderr)
        sys.exit(1)
    
    try:
        print(f"🚀 Iniciando procesamiento para {os.path.basename(archivo_pdf)}", file=sys.stderr)
        
        # Crear directorio de cache en la misma carpeta del script
        cache_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cache')
        inicializar_cache(cache_dir)
        
        texto_completo = extraer_texto_completo_pdf(archivo_pdf)

        # Intentar usar cache sobre el texto ORIGINAL (sin preprocesar) para evitar llamadas
        # innecesarias a la API si ya existe un resultado.
        hash_texto_raw = generar_hash_texto(texto_completo)
        hash_estructura_raw = generar_hash_estructura(texto_completo)
        # resultado_cache_raw, tipo_cache_raw = buscar_en_cache(hash_texto_raw, hash_estructura_raw, cache_dir) # DESACTIVADO PARA PRUEBAS
        # if resultado_cache_raw:
        #     print(resultado_cache_raw)
        #     sys.exit(0)

        # Si no hay cache, aplicar preprocesamiento para códigos Syscom con guiones
        texto_completo = procesar_guiones_syscom(texto_completo)
        if not texto_completo or not texto_completo.strip():
            sys.exit(1)
        
        json_resultado = procesar_documento_con_openai(texto_completo, os.path.basename(archivo_pdf), cache_dir)
        
        if not json_resultado:
            print("❌ El procesamiento con OpenAI falló o no arrojó resultados.", file=sys.stderr)
            sys.exit(1)

        # Imprimir resultado final en la salida estándar para que otros procesos puedan usarlo
        print(json_resultado)
        
        folio_extraido = None
        try:
            datos = json.loads(json_resultado)
            folio_extraido = datos.get('folioOriginal')
            print(f"📋 Folio extraído: {folio_extraido}", file=sys.stderr)
            print(f"✅ Proceso completado exitosamente.", file=sys.stderr)
        except json.JSONDecodeError:
            print("⚠️ El resultado final no es un JSON válido.", file=sys.stderr)

        # 🔧 DEBUG: Descomentar la siguiente línea para guardar JSON físico para debugging
        guardar_json_resultado(json_resultado, folio_extraido, os.path.basename(archivo_pdf))
    
    except Exception as e:
        error_message = f"❌ ERROR CRÍTICO: {str(e)}"
        print(error_message, file=sys.stderr)
        print(json.dumps({"error": error_message, "details": str(e)}))
        sys.exit(1)