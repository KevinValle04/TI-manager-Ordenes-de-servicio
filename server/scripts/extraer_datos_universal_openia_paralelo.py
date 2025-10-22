#!/usr/bin/env python3
"""
Script PARALELO Optimizado para Extracción de Cotizaciones/Órdenes de Compra
Versión ULTRA-RÁPIDA con procesamiento paralelo por chunks
Divide el texto en fragmentos y los procesa simultáneamente con OpenAI GPT-4o-mini
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
import asyncio
import concurrent.futures
from threading import Lock
import time

# Importaciones opcionales para OCR
try:
    from PIL import Image
    import io
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

# =================== CONFIGURACIÓN PARALELA ===================

# Configuración de paralelización
MAX_WORKERS = 3  # Reducido para mejor control
CHUNK_SIZE = 4000  # Aumentado para mejor contexto
OVERLAP_SIZE = 500  # Más solapamiento para evitar pérdidas

# Lock para escritura thread-safe
cache_lock = Lock()
resultado_lock = Lock()

# =================== FUNCIONES AUXILIARES ORIGINALES ===================

def inicializar_cache(cache_dir):
    """Inicializa el directorio de cache si no existe"""
    if not os.path.exists(cache_dir):
        os.makedirs(cache_dir)
        print(f"📁 Cache inicializado: {cache_dir}", file=sys.stderr)
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
    """Busca resultados similares en cache - Thread Safe"""
    try:
        with cache_lock:
            # Buscar cache exacto por texto
            cache_exacto = os.path.join(cache_dir, f"exact_{hash_texto}.json")
            if os.path.exists(cache_exacto):
                with open(cache_exacto, 'r', encoding='utf-8') as f:
                    cache_data = json.load(f)
                    fecha_cache = datetime.fromisoformat(cache_data['timestamp'])
                    if datetime.now() - fecha_cache < timedelta(days=7):
                        print(f"✅ Cache exacto encontrado (edad: {datetime.now() - fecha_cache})", file=sys.stderr)
                        return cache_data['resultado'], 'exacto'
            
            # Buscar cache estructural
            cache_estructura = os.path.join(cache_dir, f"struct_{hash_estructura}.json")
            if os.path.exists(cache_estructura):
                with open(cache_estructura, 'r', encoding='utf-8') as f:
                    cache_data = json.load(f)
                    fecha_cache = datetime.fromisoformat(cache_data['timestamp'])
                    if datetime.now() - fecha_cache < timedelta(days=3):
                        print(f"🔍 Cache estructural encontrado (edad: {datetime.now() - fecha_cache})", file=sys.stderr)
                        return cache_data['resultado'], 'estructural'
        
        return None, None
        
    except Exception as e:
        print(f"⚠️ Error al buscar en cache: {e}", file=sys.stderr)
        return None, None

def guardar_en_cache(hash_texto, hash_estructura, resultado, cache_dir):
    """Guarda el resultado en cache - Thread Safe"""
    try:
        with cache_lock:
            timestamp = datetime.now().isoformat()
            
            cache_exacto = os.path.join(cache_dir, f"exact_{hash_texto}.json")
            with open(cache_exacto, 'w', encoding='utf-8') as f:
                json.dump({
                    'timestamp': timestamp,
                    'hash_texto': hash_texto,
                    'resultado': resultado
                }, f, ensure_ascii=False, indent=2)
            
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

# =================== DIVISIÓN EN CHUNKS ===================

def dividir_texto_en_chunks(texto_completo, chunk_size=CHUNK_SIZE, overlap_size=OVERLAP_SIZE):
    """Divide el texto en chunks con solapamiento para contexto"""
    chunks = []
    lineas = texto_completo.split('\n')
    
    chunk_actual = ""
    linea_inicio = 0
    
    for i, linea in enumerate(lineas):
        chunk_actual += linea + '\n'
        
        # Si el chunk alcanza el tamaño deseado
        if len(chunk_actual) >= chunk_size:
            chunks.append({
                'id': len(chunks),
                'texto': chunk_actual.strip(),
                'linea_inicio': linea_inicio,
                'linea_fin': i,
                'caracteres': len(chunk_actual)
            })
            
            # Calcular overlap para el siguiente chunk
            overlap_lineas = []
            chars_overlap = 0
            for j in range(i, -1, -1):
                overlap_lineas.insert(0, lineas[j])
                chars_overlap += len(lineas[j]) + 1
                if chars_overlap >= overlap_size:
                    break
            
            chunk_actual = '\n'.join(overlap_lineas) + '\n'
            linea_inicio = max(0, i - len(overlap_lineas) + 1)
    
    # Agregar último chunk si tiene contenido
    if chunk_actual.strip():
        chunks.append({
            'id': len(chunks),
            'texto': chunk_actual.strip(),
            'linea_inicio': linea_inicio,
            'linea_fin': len(lineas) - 1,
            'caracteres': len(chunk_actual)
        })
    
    print(f"📊 Texto dividido en {len(chunks)} chunks", file=sys.stderr)
    for chunk in chunks:
        print(f"   Chunk {chunk['id']}: {chunk['caracteres']} chars, líneas {chunk['linea_inicio']}-{chunk['linea_fin']}", file=sys.stderr)
    
    return chunks

# =================== PROCESAMIENTO PARALELO ===================

def procesar_chunk_individual(chunk_info, nombre_archivo, api_key):
    """Procesa un chunk individual con OpenAI"""
    chunk_id = chunk_info['id']
    texto_chunk = chunk_info['texto']
    
    try:
        print(f"🧩 [Chunk {chunk_id}] Iniciando procesamiento...", file=sys.stderr)
        
        client = OpenAI(
            api_key=api_key,
            timeout=60.0,  # Timeout más corto para chunks
            max_retries=2
        )
        
        # Prompt optimizado para chunks con mayor contexto
        prompt_chunk = f"""Extrae TODOS los productos de esta sección del documento "{nombre_archivo}":

Devuelve un JSON con este formato:
{{
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
  "metadata": {{
    "chunk_id": {chunk_id},
    "productos_encontrados": number,
    "folio_parcial": "string|null",
    "fecha_parcial": "string|null"
  }}
}}

REGLAS CRÍTICAS:
- Extraer TODOS los productos de esta sección, SIN OMITIR NINGUNO
- Incluir productos con precio 0 también
- NO inventar datos que no estén en el texto
- Si hay dudas sobre si es producto, INCLUIRLO
- Si encuentra códigos como DS*, EP*, KIT*, incluirlos SIEMPRE
- Capturar folio/fecha si aparecen en esta sección

SECCIÓN DEL DOCUMENTO:
{texto_chunk}"""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt_chunk}],
            temperature=0.0,
            max_tokens=4096,
            timeout=60
        )
        
        resultado_str = response.choices[0].message.content
        
        # Extraer JSON del resultado
        first_brace = resultado_str.find('{')
        if first_brace != -1:
            # Encontrar el JSON balanceado
            stack = []
            in_string = False
            escape_char = False
            
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
                            if not stack:
                                resultado_str = resultado_str[first_brace:i + 1]
                                break
        
        # Validar JSON
        resultado_json = json.loads(resultado_str)
        productos = resultado_json.get('productos', [])
        
        print(f"✅ [Chunk {chunk_id}] Procesado: {len(productos)} productos encontrados", file=sys.stderr)
        
        return {
            'chunk_id': chunk_id,
            'exito': True,
            'productos': productos,
            'metadata': resultado_json.get('metadata', {}),
            'tiempo_procesamiento': time.time()
        }
        
    except Exception as e:
        print(f"❌ [Chunk {chunk_id}] Error: {e}", file=sys.stderr)
        return {
            'chunk_id': chunk_id,
            'exito': False,
            'error': str(e),
            'productos': [],
            'metadata': {}
        }

def procesar_chunks_paralelo(chunks, nombre_archivo, max_workers=MAX_WORKERS):
    """Procesa múltiples chunks en paralelo"""
    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        raise ValueError("OPENAI_API_KEY no encontrada")
    
    print(f"🚀 Iniciando procesamiento paralelo con {max_workers} workers", file=sys.stderr)
    
    resultados = []
    tiempo_inicio = time.time()
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Crear futures para cada chunk
        futures = {
            executor.submit(procesar_chunk_individual, chunk, nombre_archivo, api_key): chunk['id']
            for chunk in chunks
        }
        
        # Recopilar resultados conforme se completan
        for future in concurrent.futures.as_completed(futures):
            chunk_id = futures[future]
            try:
                resultado = future.result()
                resultados.append(resultado)
                
                if resultado['exito']:
                    print(f"⚡ [Chunk {chunk_id}] Completado exitosamente", file=sys.stderr)
                else:
                    print(f"⚠️ [Chunk {chunk_id}] Falló: {resultado.get('error', 'Error desconocido')}", file=sys.stderr)
                    
            except Exception as e:
                print(f"❌ [Chunk {chunk_id}] Excepción: {e}", file=sys.stderr)
                resultados.append({
                    'chunk_id': chunk_id,
                    'exito': False,
                    'error': str(e),
                    'productos': [],
                    'metadata': {}
                })
    
    tiempo_total = time.time() - tiempo_inicio
    print(f"⏱️ Procesamiento paralelo completado en {tiempo_total:.2f} segundos", file=sys.stderr)
    
    # Ordenar resultados por chunk_id
    resultados.sort(key=lambda x: x['chunk_id'])
    
    return resultados

# =================== CONSOLIDACIÓN DE RESULTADOS ===================

def consolidar_resultados_chunks(resultados_chunks, texto_completo, nombre_archivo):
    """Consolida los resultados de múltiples chunks en un resultado final con deduplicación inteligente"""
    print(f"🔄 Consolidando resultados de {len(resultados_chunks)} chunks...", file=sys.stderr)
    
    todos_productos = []
    productos_vistos = set()  # Para deduplicación inteligente
    folios_encontrados = []
    fechas_encontradas = []
    chunks_exitosos = 0
    
    # Primera pasada: recopilar todos los productos con deduplicación inteligente
    for resultado in resultados_chunks:
        if resultado['exito']:
            chunks_exitosos += 1
            productos_chunk = resultado['productos']
            
            print(f"   📦 Chunk {resultado['chunk_id']}: {len(productos_chunk)} productos", file=sys.stderr)
            
            for producto in productos_chunk:
                # Crear clave única simple: solo el código
                codigo = producto.get('codigo', '').strip()
                
                # Solo agregar si no hemos visto este código antes
                if codigo and codigo not in productos_vistos:
                    productos_vistos.add(codigo)
                    producto['linea'] = len(todos_productos) + 1
                    todos_productos.append(producto)
                    print(f"      ✅ Agregado: {codigo}", file=sys.stderr)
                elif codigo:
                    print(f"      🔄 Duplicado omitido: {codigo}", file=sys.stderr)
            
            # Recopilar metadatos
            metadata = resultado.get('metadata', {})
            if metadata.get('folio_parcial'):
                folios_encontrados.append(metadata['folio_parcial'])
            if metadata.get('fecha_parcial'):
                fechas_encontradas.append(metadata['fecha_parcial'])
    
    # Verificación de integridad - buscar productos que pudieron perderse
    print(f"🔍 Verificando integridad de la extracción...", file=sys.stderr)
    
    # Buscar códigos que podrían haberse perdido en el texto completo
    codigos_en_texto = set(re.findall(r'\b[A-Z0-9]{3,15}\b', texto_completo))
    codigos_extraidos = {p.get('codigo', '') for p in todos_productos}
    codigos_perdidos = codigos_en_texto - codigos_extraidos
    
    # Filtrar códigos perdidos que realmente parecen códigos de producto
    codigos_potenciales = []
    for codigo in codigos_perdidos:
        # Criterios para identificar códigos de producto
        if (len(codigo) >= 4 and 
            (codigo.startswith(('DS', 'EP', 'KIT', 'RT', 'GOF', 'LK', 'PLB', 'CBR', 'ACCESS', 'BG', 'SB', 'MAG', 'BZL', 'SD', '44', 'TT', 'ES', 'PS', 'P2R', 'HK')) or
             re.match(r'^[A-Z0-9]{4,15}$', codigo))):
            codigos_potenciales.append(codigo)
    
    if codigos_potenciales:
        print(f"⚠️ Posibles códigos perdidos: {len(codigos_potenciales)}", file=sys.stderr)
        for codigo in codigos_potenciales[:5]:  # Mostrar solo los primeros 5
            print(f"      - {codigo}", file=sys.stderr)
    
    # Determinar folio y fecha finales
    folio_final = folios_encontrados[0] if folios_encontrados else None
    fecha_final = fechas_encontradas[0] if fechas_encontradas else None
    
    # Si no se encontraron en chunks, buscar en texto completo
    if not folio_final:
        folio_match = re.search(r'(?:FOLIO|ORDEN|COTIZACIÓN|QUOTE)[:\s]*([A-Z0-9]+)', texto_completo, re.IGNORECASE)
        if folio_match:
            folio_final = folio_match.group(1)
    
    if not fecha_final:
        fecha_match = re.search(r'(\d{1,2}[/-]\d{1,2}[/-]\d{4})', texto_completo)
        if fecha_match:
            try:
                fecha_str = fecha_match.group(1)
                if '/' in fecha_str:
                    fecha_obj = datetime.strptime(fecha_str, '%d/%m/%Y')
                else:
                    fecha_obj = datetime.strptime(fecha_str, '%d-%m-%Y')
                fecha_final = fecha_obj.strftime('%Y-%m-%d')
            except:
                fecha_final = None
    
    # Calcular totales
    subtotal = sum(p.get('importe', 0) for p in todos_productos)
    iva = subtotal * 0.16
    total = subtotal + iva
    
    # Determinar moneda
    moneda = "MXN"
    if re.search(r'\$|pesos|MXN', texto_completo, re.IGNORECASE):
        moneda = "MXN"
    elif re.search(r'USD|\$USD|dólares', texto_completo, re.IGNORECASE):
        moneda = "USD"
    
    resultado_final = {
        "folioOriginal": folio_final,
        "fecha": fecha_final,
        "productos": todos_productos,
        "totales": {
            "subtotal": round(subtotal, 2),
            "iva": round(iva, 2),
            "total": round(total, 2)
        },
        "moneda": moneda,
        "condiciones": None,
        "procesamiento": {
            "metodo": "paralelo_chunks",
            "chunks_procesados": len(resultados_chunks),
            "chunks_exitosos": chunks_exitosos,
            "productos_totales": len(todos_productos),
            "codigos_potencialmente_perdidos": len(codigos_potenciales) if codigos_potenciales else 0
        }
    }
    
    print(f"✅ Consolidación completada:", file=sys.stderr)
    print(f"   📊 Productos totales: {len(todos_productos)}", file=sys.stderr)
    print(f"   📋 Folio: {folio_final}", file=sys.stderr)
    print(f"   📅 Fecha: {fecha_final}", file=sys.stderr)
    print(f"   ⚡ Chunks exitosos: {chunks_exitosos}/{len(resultados_chunks)}", file=sys.stderr)
    
    if codigos_potenciales:
        print(f"   ⚠️ Posibles productos perdidos: {len(codigos_potenciales)}", file=sys.stderr)
    
    return json.dumps(resultado_final, ensure_ascii=False, indent=2)

# =================== FUNCIÓN PRINCIPAL PARALELA ===================

def procesar_documento_paralelo(texto_completo, nombre_archivo, cache_dir):
    """Función principal que coordina el procesamiento paralelo"""
    if not texto_completo or not texto_completo.strip():
        return None
    
    # Verificar cache primero
    hash_texto = generar_hash_texto(texto_completo)
    hash_estructura = generar_hash_estructura(texto_completo)
    
    print(f"🔍 Buscando en cache...", file=sys.stderr)
    # TEMPORALMENTE DESHABILITADO PARA TESTING
    # resultado_cache, tipo_cache = buscar_en_cache(hash_texto, hash_estructura, cache_dir)
    # if resultado_cache:
    #     print(f"⚡ CACHE HIT ({tipo_cache}) - Ahorro de ~95% tiempo y costo", file=sys.stderr)
    #     return resultado_cache
    
    print(f"🤖 Cache deshabilitado, procesando con método PARALELO...", file=sys.stderr)
    
    # Dividir en chunks
    chunks = dividir_texto_en_chunks(texto_completo)
    
    if len(chunks) == 1:
        print(f"📝 Documento pequeño, usando procesamiento secuencial", file=sys.stderr)
        # Para documentos pequeños, usar método original sería más eficiente
        # Pero mantenemos paralelo para consistencia
    
    # Procesar chunks en paralelo
    resultados_chunks = procesar_chunks_paralelo(chunks, nombre_archivo)
    
    # Consolidar resultados
    resultado_final = consolidar_resultados_chunks(resultados_chunks, texto_completo, nombre_archivo)
    
    # Guardar en cache - TEMPORALMENTE DESHABILITADO
    # guardar_en_cache(hash_texto, hash_estructura, resultado_final, cache_dir)
    
    return resultado_final

# =================== IMPORTAR FUNCIONES DE EXTRACCIÓN ===================

def extraer_texto_completo_pdf(archivo_pdf):
    """Extrae texto del PDF priorizando velocidad - Versión simplificada para paralelo"""
    import pdfplumber
    import PyPDF2
    
    print(f"📄 Extrayendo texto de: {archivo_pdf}", file=sys.stderr)
    
    # MÉTODO 1: PyMuPDF si está disponible
    try:
        import fitz
        doc = fitz.open(archivo_pdf)
        texto_completo = ""
        
        for i, page in enumerate(doc, 1):
            texto = page.get_text("text")
            if texto and texto.strip():
                texto_completo += f"\n=== PÁGINA {i} ===\n{texto}\n"
        
        doc.close()
        
        if texto_completo.strip():
            print(f"✅ Extraído con PyMuPDF - {len(doc)} páginas", file=sys.stderr)
            return texto_completo
        
    except ImportError:
        print("⚠️ PyMuPDF no disponible, usando pdfplumber...", file=sys.stderr)
    except Exception as e:
        print(f"⚠️ Error PyMuPDF: {e}, usando pdfplumber...", file=sys.stderr)
    
    # MÉTODO 2: pdfplumber
    try:
        texto_completo = ""
        with pdfplumber.open(archivo_pdf) as pdf:
            for i, page in enumerate(pdf.pages, 1):
                texto = page.extract_text()
                if texto:
                    texto_completo += f"\n=== PÁGINA {i} ===\n{texto}\n"
        
        if texto_completo.strip():
            print(f"✅ Extraído con pdfplumber - {len(pdf.pages)} páginas", file=sys.stderr)
            return texto_completo
            
    except Exception as e:
        print(f"❌ Error pdfplumber: {e}. Usando PyPDF2...", file=sys.stderr)
    
    # MÉTODO 3: PyPDF2
    try:
        texto_completo = ""
        with open(archivo_pdf, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            for i, page in enumerate(pdf_reader.pages, 1):
                texto_pagina = page.extract_text()
                if texto_pagina:
                    texto_completo += f"\n=== PÁGINA {i} ===\n{texto_pagina}\n"
        
        if texto_completo.strip():
            print(f"✅ Extraído con PyPDF2 - {len(pdf_reader.pages)} páginas", file=sys.stderr)
            return texto_completo
            
    except Exception as e:
        print(f"❌ Error PyPDF2: {e}", file=sys.stderr)
    
    return None

def guardar_json_resultado(json_resultado, folio_original, nombre_archivo_original):
    """Guarda el resultado JSON en un archivo usando el folio como nombre."""
    try:
        directorio_resultados = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'resultados_json')
        if not os.path.exists(directorio_resultados):
            os.makedirs(directorio_resultados)
        
        if folio_original and str(folio_original).strip():
            folio_limpio = re.sub(r'[<>:"/\\|?*\s]', '_', str(folio_original).strip())
            nombre_archivo = f"orden_{folio_limpio}.json"
        else:
            base_name = os.path.splitext(os.path.basename(nombre_archivo_original))[0]
            nombre_archivo = f"orden_{re.sub(r'[<>:\"/\\\\|?*\\s]', '_', base_name)}.json"
        
        ruta_completa = os.path.join(directorio_resultados, nombre_archivo)
        
        with open(ruta_completa, 'w', encoding='utf-8') as f:
            if isinstance(json_resultado, str):
                json_parseado = json.loads(json_resultado)
                json.dump(json_parseado, f, indent=2, ensure_ascii=False)
            else:
                json.dump(json_resultado, f, indent=2, ensure_ascii=False)
        
        print(f"💾 JSON guardado en: {ruta_completa}", file=sys.stderr)
        return ruta_completa
    except Exception as e:
        print(f"❌ Error al guardar JSON: {str(e)}", file=sys.stderr)
        return None

# =================== ENTRADA PRINCIPAL ===================

if __name__ == "__main__":
    cargar_env()
    
    if len(sys.argv) != 2:
        print("❌ ERROR: Se requiere la ruta del archivo PDF como argumento.", file=sys.stderr)
        print("Uso: python extraer_datos_universal_openia_paralelo.py <archivo_pdf>", file=sys.stderr)
        sys.exit(1)
    
    archivo_pdf = sys.argv[1]
    if not os.path.exists(archivo_pdf):
        print(f"❌ Error: El archivo {archivo_pdf} no existe.", file=sys.stderr)
        sys.exit(1)
    
    try:
        print(f"🚀 Iniciando procesamiento PARALELO con OpenAI GPT-4o-mini", file=sys.stderr)
        print(f"⚡ Configuración: {MAX_WORKERS} workers, chunks de {CHUNK_SIZE} chars", file=sys.stderr)
        
        tiempo_total_inicio = time.time()
        
        # Inicializar cache
        cache_dir = os.path.join(os.path.dirname(archivo_pdf), '..', 'cache')
        inicializar_cache(cache_dir)
        
        # Extraer texto (usando función original)
        print(f"📄 Extrayendo texto del PDF...", file=sys.stderr)
        texto_completo = extraer_texto_completo_pdf(archivo_pdf)
        if not texto_completo or not texto_completo.strip():
            print("❌ No se pudo extraer texto del PDF.", file=sys.stderr)
            sys.exit(1)
        
        print(f"📊 Texto extraído: {len(texto_completo)} caracteres", file=sys.stderr)
        
        # Procesar con método paralelo
        json_resultado = procesar_documento_paralelo(texto_completo, os.path.basename(archivo_pdf), cache_dir)
        
        if not json_resultado:
            print("❌ El procesamiento paralelo falló.", file=sys.stderr)
            sys.exit(1)
        
        tiempo_total = time.time() - tiempo_total_inicio
        print(f"⏱️ Tiempo total: {tiempo_total:.2f} segundos", file=sys.stderr)
        
        # Mostrar resultado
        print(json_resultado)  # Para stdout
        
        # Guardar archivo
        try:
            json_parseado = json.loads(json_resultado)
            folio = json_parseado.get('folioOriginal')
            num_productos = len(json_parseado.get('productos', []))
            
            print(f"📋 Folio: {folio}", file=sys.stderr)
            print(f"📊 Productos: {num_productos}", file=sys.stderr)
            
            archivo_guardado = guardar_json_resultado(json_resultado, folio, os.path.basename(archivo_pdf))
            if archivo_guardado:
                print(f"✅ Procesamiento PARALELO completado exitosamente", file=sys.stderr)
                
        except Exception as e:
            print(f"⚠️ Error al procesar resultado final: {e}", file=sys.stderr)
    
    except Exception as e:
        print(f"❌ ERROR CRÍTICO: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)