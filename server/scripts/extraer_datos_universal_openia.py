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
from openai import OpenAI

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
            texto = page.get_text("text")
            if texto:
                texto_completo += f"\n=== PÁGINA {i} ===\n{texto}\n"
        
        doc.close()
        print(f"✅ Extraído con PyMuPDF - {len(doc)} páginas", file=sys.stderr)
        return texto_completo
        
    except ImportError:
        print("⚠️ PyMuPDF no disponible, usando pdfplumber...", file=sys.stderr)
    except Exception as e:
        print(f"⚠️ Error PyMuPDF: {e}, usando pdfplumber...", file=sys.stderr)
    
    # MÉTODO 2: pdfplumber (configuración rápida)
    try:
        texto_completo = ""
        with pdfplumber.open(archivo_pdf) as pdf:
            for i, page in enumerate(pdf.pages, 1):
                texto = page.extract_text(x_tolerance=2, y_tolerance=2)  # Tolerancia reducida para velocidad
                if texto:
                    texto_completo += f"\n=== PÁGINA {i} ===\n{texto}\n"
            
        print(f"✅ Extraído con pdfplumber - {len(pdf.pages)} páginas", file=sys.stderr)
        return texto_completo
                    
    except Exception as e:
        print(f"❌ Error pdfplumber: {e}. Usando PyPDF2...", file=sys.stderr)
        
        # MÉTODO 3: PyPDF2 (fallback rápido)
        try:
            texto_completo = ""
            with open(archivo_pdf, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for i, page in enumerate(pdf_reader.pages, 1):
                    texto_pagina = page.extract_text()
                    if texto_pagina:
                        texto_completo += f"\n=== PÁGINA {i} ===\n{texto_pagina}\n"
            
            print(f"✅ Extraído con PyPDF2 - {len(pdf_reader.pages)} páginas", file=sys.stderr)
            return texto_completo
            
        except Exception as e2:
            print(f"❌ Error PyPDF2: {e2}", file=sys.stderr)
            return None

# =================== PROCESAMIENTO CON OPENAI GPT-4O-MINI ===================

def procesar_documento_con_openai(texto_completo, nombre_archivo):
    """Procesa el documento usando OpenAI GPT-4o-mini"""
    if not texto_completo or not texto_completo.strip():
        return None

    print(f"🤖 Procesando con OpenAI GPT-4o-mini...", file=sys.stderr)
    
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

    # Prompt ultra-optimizado para velocidad
    prompt_consolidado = f"""Extrae datos del documento "{nombre_archivo}" en JSON:

{{
  "folioOriginal": "string",
  "fecha": "YYYY-MM-DD",
  "proveedor": {{"nombre": "string", "rfc": "string|null", "direccion": "string|null"}},
  "cliente": {{"nombre": "string", "rfc": "string|null", "direccion": "string|null", "contacto": "string|null"}},
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
        
        # PASO 1: Extraer TODO el texto del PDF (con métodos optimizados)
        texto_completo = extraer_texto_completo_pdf(archivo_pdf)
        if not texto_completo:
            print("❌ No se pudo extraer texto del PDF.", file=sys.stderr)
            sys.exit(1)
        
        # Imprimir información sobre el tamaño del texto
        num_caracteres = len(texto_completo)
        num_tokens_aprox = num_caracteres // 4
        print(f"📊 Tamaño del texto extraído: {num_caracteres} caracteres ({num_tokens_aprox} tokens aprox.)", file=sys.stderr)

        # PASO 2: Procesar el documento completo SOLO con OpenAI
        json_resultado = procesar_documento_con_openai(texto_completo, os.path.basename(archivo_pdf))
        
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