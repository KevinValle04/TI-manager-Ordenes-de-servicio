#!/usr/bin/env python3
"""
Script Optimizado para Extracción de Cotizaciones/Órdenes de Compra
Extrae texto en paralelo pero con estrategia de validación y re-procesamiento
para garantizar extracción completa de productos.
"""

import pdfplumber
import PyPDF2
import sys
import os
import json
import re
from openai import OpenAI
from concurrent.futures import ThreadPoolExecutor, as_completed

# =================== FUNCIONES AUXILIARES ===================

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

# =================== EXTRACCIÓN DE TEXTO (PARALELIZADA) ===================

def extraer_pagina(page, num_pagina):
    """Extrae texto de una página individual."""
    try:
        texto = page.extract_text()
        return (num_pagina, f"\n=== PÁGINA {num_pagina} ===\n{texto or ''}\n")
    except Exception as e:
        print(f"⚠️  Error extrayendo página {num_pagina}: {e}", file=sys.stderr)
        return (num_pagina, "")

def extraer_texto_por_paginas_pdf(archivo_pdf):
    """Extrae texto del PDF página por página usando paralelización."""
    print(f"📄 Extrayendo texto de: {archivo_pdf}", file=sys.stderr)
    try:
        with pdfplumber.open(archivo_pdf) as pdf:
            num_paginas = len(pdf.pages)
            print(f"📖 PDF tiene {num_paginas} página(s)", file=sys.stderr)
            
            resultados = {}
            with ThreadPoolExecutor(max_workers=min(num_paginas, 8)) as executor:
                futures = {executor.submit(extraer_pagina, page, i): i for i, page in enumerate(pdf.pages, 1)}
                for future in as_completed(futures):
                    num_pagina, texto_pagina = future.result()
                    resultados[num_pagina] = texto_pagina
                    print(f"   ✓ Página {num_pagina} leída", file=sys.stderr)
            
            print(f"✅ Extracción de texto completada.", file=sys.stderr)
            return resultados
                    
    except Exception as e:
        print(f"❌ Error con pdfplumber: {e}. Intentando con PyPDF2...", file=sys.stderr)
        try:
            resultados = {}
            with open(archivo_pdf, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for i, page in enumerate(pdf_reader.pages, 1):
                    texto_pagina = page.extract_text()
                    if texto_pagina:
                        resultados[i] = f"\n=== PÁGINA {i} ===\n{texto_pagina}\n"
                return resultados
        except Exception as e2:
            print(f"❌ Error con PyPDF2: {e2}", file=sys.stderr)
            return None

# =================== PROCESAMIENTO CON IA ===================

def procesar_pagina_con_deepseek(num_pagina, texto_pagina, nombre_archivo, es_ultima_pagina=False):
    """Envía el texto de UNA SOLA PÁGINA a DeepSeek para análisis."""
    if not texto_pagina or not texto_pagina.strip():
        return (num_pagina, None)

    print(f"🤖 Enviando página {num_pagina} a DeepSeek...", file=sys.stderr)
    
    api_key = os.environ.get('DEEPSEEK_API_KEY')
    if not api_key:
        print("❌ ERROR: Variable de entorno DEEPSEEK_API_KEY no encontrada", file=sys.stderr)
        return (num_pagina, None)
        
    client = OpenAI(api_key=api_key, base_url="https://api.deepseek.com")

    system_prompt = """Eres un experto analista de documentos comerciales. Extrae información de esta página de una cotización/orden de compra.

Extrae TODA la información presente en esta página:

1. **folioOriginal**: Número de folio/cotización si aparece (ej: "369709")
2. **fecha**: Fecha del documento en formato YYYY-MM-DD si aparece
3. **productos**: Lista de TODOS los productos en esta página. CRÍTICO: No omitas ningún producto.
   Estructura:
   {
     "linea": number,
     "codigo": string,
     "descripcion": string,
     "cantidad": number,
     "unidad": string,
     "precioUnitario": number,
     "descuento": number,
     "importe": number
   }
4. **totales**: Solo si es la última página y aparecen totales
   {
     "subtotal": number,
     "iva": number,
     "total": number
   }

REGLAS:
- Extrae TODOS los productos de la tabla sin excepción
- Números sin símbolos de moneda ni comas
- Si no hay información de una sección, omite esa clave
- Responde SOLO con JSON válido, sin texto adicional
"""

    user_prompt = f'Extrae TODOS los datos de esta página:\n\n{texto_pagina}'

    try:
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            stream=False,
            temperature=0.0,
            max_tokens=4096,
            timeout=60
        )
        resultado_str = response.choices[0].message.content
        
        # Extraer JSON limpio
        json_start_index = -1
        first_brace = resultado_str.find('{')
        first_bracket = resultado_str.find('[')
        
        if first_brace != -1 and first_bracket != -1:
            json_start_index = min(first_brace, first_bracket)
        elif first_brace != -1:
            json_start_index = first_brace
        else:
            json_start_index = first_bracket

        if json_start_index != -1:
            last_brace = resultado_str.rfind('}')
            last_bracket = resultado_str.rfind(']')
            json_end_index = max(last_brace, last_bracket)
            
            if json_end_index > json_start_index:
                resultado_str = resultado_str[json_start_index : json_end_index + 1]

        json.loads(resultado_str)  # Validar
        print(f"   ✓ Página {num_pagina} analizada", file=sys.stderr)
        return (num_pagina, resultado_str)
    except Exception as e:
        print(f"⚠️  Error analizando página {num_pagina}: {e}", file=sys.stderr)
        return (num_pagina, None)

# =================== FUSIÓN Y VALIDACIÓN ===================

def fusionar_resultados_json(resultados_por_pagina):
    """Combina los resultados JSON de cada página."""
    json_final = {
        "folioOriginal": None,
        "fecha": None,
        "productos": [],
        "totales": {}
    }

    for num_pagina in sorted(resultados_por_pagina.keys()):
        json_str = resultados_por_pagina[num_pagina]
        if not json_str:
            continue
        
        try:
            data = json.loads(json_str)
            if not isinstance(data, dict):
                continue

            if data.get('folioOriginal') and not json_final['folioOriginal']:
                json_final['folioOriginal'] = data['folioOriginal']
            
            if data.get('fecha') and not json_final['fecha']:
                json_final['fecha'] = data['fecha']
            
            if isinstance(data.get('productos'), list):
                json_final['productos'].extend(data['productos'])
            
            if isinstance(data.get('totales'), dict):
                json_final['totales'].update(data['totales'])
                
        except (json.JSONDecodeError, TypeError) as e:
            print(f"⚠️  Error procesando JSON de página {num_pagina}: {e}", file=sys.stderr)
    
    # Limpiar claves vacías
    if json_final["folioOriginal"] is None:
        del json_final["folioOriginal"]
    if json_final["fecha"] is None:
        del json_final["fecha"]

    return json.dumps(json_final, indent=2, ensure_ascii=False)

def validar_productos_extraidos(json_resultado, textos_por_pagina):
    """Valida que se hayan extraído todos los productos contando líneas en el texto."""
    try:
        data = json.loads(json_resultado)
        num_productos_extraidos = len(data.get('productos', []))
        
        # Contar líneas numeradas en el texto original
        texto_completo = "\n".join(textos_por_pagina.values())
        # Buscar patrones como "| 1 |", "| 20 |", etc. en tablas
        lineas_encontradas = set()
        for match in re.finditer(r'\|\s*(\d+)\s*\|', texto_completo):
            lineas_encontradas.add(int(match.group(1)))
        
        num_lineas_esperadas = len(lineas_encontradas)
        
        print(f"📊 Productos extraídos: {num_productos_extraidos}", file=sys.stderr)
        print(f"📊 Líneas detectadas en PDF: {num_lineas_esperadas}", file=sys.stderr)
        
        if num_productos_extraidos < num_lineas_esperadas:
            print(f"⚠️  ADVERTENCIA: Faltan {num_lineas_esperadas - num_productos_extraidos} productos", file=sys.stderr)
            return False
        
        return True
    except Exception as e:
        print(f"⚠️  Error en validación: {e}", file=sys.stderr)
        return True  # Continuar si hay error en validación

# =================== ENTRADA PRINCIPAL ===================

if __name__ == "__main__":
    cargar_env()
    
    if len(sys.argv) != 2:
        print("❌ ERROR: Se requiere la ruta del archivo PDF como argumento.", file=sys.stderr)
        print("Uso: python extraer_datos_optimizado.py <archivo_pdf>", file=sys.stderr)
        sys.exit(1)
    
    archivo_pdf = sys.argv[1]
    if not os.path.exists(archivo_pdf):
        print(f"❌ Error: El archivo {archivo_pdf} no existe.", file=sys.stderr)
        sys.exit(1)
    
    try:
        # PASO 1: Extraer texto del PDF página por página (paralelo)
        textos_por_pagina = extraer_texto_por_paginas_pdf(archivo_pdf)
        if not textos_por_pagina:
            print("❌ No se pudo extraer texto del PDF.", file=sys.stderr)
            sys.exit(1)

        # PASO 2: Procesar cada página con DeepSeek en paralelo
        resultados_ia_por_pagina = {}
        num_paginas = len(textos_por_pagina)
        
        with ThreadPoolExecutor(max_workers=min(num_paginas, 4)) as executor:
            futures = {
                executor.submit(
                    procesar_pagina_con_deepseek, 
                    num, 
                    texto, 
                    os.path.basename(archivo_pdf),
                    num == num_paginas
                ): num
                for num, texto in textos_por_pagina.items()
            }
            for future in as_completed(futures):
                num_pagina, resultado_json = future.result()
                if resultado_json:
                    resultados_ia_por_pagina[num_pagina] = resultado_json

        if not resultados_ia_por_pagina:
            print("❌ El procesamiento con IA no arrojó resultados válidos.", file=sys.stderr)
            sys.exit(1)

        # PASO 3: Fusionar resultados
        print("🔄 Fusionando resultados...", file=sys.stderr)
        json_completo_str = fusionar_resultados_json(resultados_ia_por_pagina)
        
        # PASO 4: Validar extracción completa
        validar_productos_extraidos(json_completo_str, textos_por_pagina)
        
        # PASO 5: Mostrar y guardar resultado
        print(json_completo_str)
        
        folio_extraido = None
        try:
            json_final_parseado = json.loads(json_completo_str)
            folio_extraido = json_final_parseado.get('folioOriginal')
            num_productos = len(json_final_parseado.get('productos', []))
            print(f"📋 Folio detectado: {folio_extraido}", file=sys.stderr)
        except Exception:
            pass

        archivo_guardado = guardar_json_resultado(
            json_completo_str, 
            folio_extraido, 
            os.path.basename(archivo_pdf)
        )

        if archivo_guardado:
            print(f"✅ Proceso completado exitosamente.", file=sys.stderr)
    
    except Exception as e:
        error_message = f"❌ ERROR CRÍTICO: {str(e)}"
        print(error_message, file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        
        error_json = {"error": error_message, "details": str(e)}
        print(json.dumps(error_json))
        sys.exit(1)