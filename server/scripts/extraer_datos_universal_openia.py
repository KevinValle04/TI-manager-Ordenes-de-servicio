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
    """Detecta si un PDF parece ser un escaneo (imagen).
    Solo marca como escaneado si NO hay texto extraíble Y hay imágenes grandes.
    """
    try:
        if PYMUPDF_AVAILABLE:
            doc = fitz.open(archivo_pdf)
            total_texto = ""
            tiene_imagenes_grandes = False
            
            for page in doc:
                # Extraer texto de la página
                texto_pagina = page.get_text().strip()
                total_texto += texto_pagina
                
                # Verificar imágenes solo si no hay texto
                if not texto_pagina:
                    image_list = page.get_images()
                    if image_list:
                        for img in image_list:
                            try:
                                xref = img[0]
                                imagen = doc.extract_image(xref)
                                if imagen:
                                    # Si hay una imagen grande que cubre la mayoría de la página
                                    image_size = imagen["width"] * imagen["height"]
                                    page_size = page.rect.width * page.rect.height
                                    if image_size > 0.7 * page_size:  # Si la imagen cubre >70% de la página
                                        tiene_imagenes_grandes = True
                                        break
                            except Exception as img_error:
                                # Ignorar errores al extraer imágenes individuales
                                continue
            
            doc.close()
            
            # Solo es escaneado si NO hay texto Y tiene imágenes grandes
            if not total_texto.strip() and tiene_imagenes_grandes:
                print(f"⚠️ PDF sin texto extraíble con imágenes grandes detectado", file=sys.stderr)
                return True
            
            # Si hay texto, no es un escaneo aunque tenga imágenes
            if total_texto.strip():
                print(f"✅ PDF contiene texto extraíble ({len(total_texto)} caracteres)", file=sys.stderr)
                return False
            
    except Exception as e:
        print(f"⚠️ Error al detectar si es escaneo: {e}", file=sys.stderr)
    
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

# =================== PROCESAMIENTO CON OPENAI ===================

def procesar_documento_con_openai(texto_completo, nombre_archivo, cache_dir):
    """Procesa el documento usando OpenAI GPT-4o para máxima velocidad y precisión."""
    if not texto_completo or not texto_completo.strip():
        return None

    hash_texto = generar_hash_texto(texto_completo)
    hash_estructura = generar_hash_estructura(texto_completo)
    
    resultado_cache, _ = buscar_en_cache(hash_texto, hash_estructura, cache_dir)
    if resultado_cache:
        print(f"⚡ CACHE HIT! Usando resultado guardado.", file=sys.stderr)
        return resultado_cache

    print(f"🤖 Procesando con OpenAI GPT-4o (Modelo insignia)...", file=sys.stderr)
    
    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        print("❌ ERROR: Variable de entorno OPENAI_API_KEY no encontrada.", file=sys.stderr)
        return None

    client = OpenAI(api_key=api_key, timeout=120.0, max_retries=2)

    prompt_consolidado = f"""Extrae los datos del siguiente documento de cotización en un formato JSON estructurado.

**Esquema JSON Requerido:**
{{
  "folioOriginal": "string",
  "fecha": "YYYY-MM-DD",
  "productos": [{{
    "linea": "number (debe ser un contador secuencial iniciando en 1)",
    "codigo": "string",
    "descripcion": "string",
    "cantidad": "number",
    "unidad": "string",
    "precioUnitario": "number",
    "importe": "number"
  }}],
  "totales": {{"subtotal": "number", "iva": "number", "total": "number"}},
  "moneda": "string (Detecta la moneda, si no se especifica, asume 'MXN')"
}}

**REGLAS CRÍTICAS E INAMOVIBLES PARA LA EXTRACCIÓN:**
1.  **PRECIO UNITARIO ES LA CLAVE:** El valor para `precioUnitario` DEBE ser extraído **EXCLUSIVAMENTE** de la columna llamada 'PRECIO UNITARIO' en el documento.
2.  **IGNORAR OTRAS COLUMNAS DE PRECIOS:** Ignora por completo la columna 'PRECIO DE LISTA' y la columna 'DESCUENTOS'. Sus valores **NUNCA** deben usarse para el campo `precioUnitario`.
3.  **LÍNEAS FÍSICAS:** Cada fila que representa un producto en el documento debe ser un objeto separado en el array `productos`. No omitas ninguna línea, incluso si sus valores de precio o importe son nulos o cero.
4.  **PRECISIÓN NUMÉRICA:** Extrae todos los números (cantidades, precios, importes, totales) exactamente como aparecen en el documento, conservando los decimales.
5.  **TOTALES:** Los valores de `subtotal`, `iva` y `total` deben ser extraídos de la sección de totales al final del documento (usualmente en la última página).

**DOCUMENTO A PROCESAR:**
(Nombre del archivo: {nombre_archivo})
---
{texto_completo}
---
"""

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
        resultado_str = response.choices[0].message.content
        
        # Validación básica del JSON
        json_parseado = json.loads(resultado_str)
        if 'productos' not in json_parseado or 'totales' not in json_parseado:
            raise ValueError("El JSON no contiene los campos requeridos 'productos' o 'totales'.")

        print(f"   ✓ Documento analizado por GPT-4o.", file=sys.stderr)
        print(f"   📊 Productos extraídos: {len(json_parseado.get('productos', []))}", file=sys.stderr)
        
        guardar_en_cache(hash_texto, hash_estructura, resultado_str, cache_dir)
        return resultado_str
        
    except Exception as e:
        print(f"❌ Error procesando con OpenAI: {e}", file=sys.stderr)
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

        #guardar_json_resultado(json_resultado, folio_extraido, os.path.basename(archivo_pdf))
    
    except Exception as e:
        error_message = f"❌ ERROR CRÍTICO: {str(e)}"
        print(error_message, file=sys.stderr)
        print(json.dumps({"error": error_message, "details": str(e)}))
        sys.exit(1)