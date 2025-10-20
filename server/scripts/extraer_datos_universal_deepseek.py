#!/usr/bin/env python3
"""
Script Optimizado para Extracción de Cotizaciones/Órdenes de Compra
Extrae TODO el texto del PDF y lo procesa en UNA SOLA llamada a DeepSeek
para garantizar consistencia en los resultados.
"""

import pdfplumber
import PyPDF2
import sys
import os
import json
import re
from openai import OpenAI
import fitz  # PyMuPDF

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

# =================== EXTRACCIÓN DE TEXTO COMPLETO ===================

def extraer_con_pymupdf(archivo_pdf):
    """Extrae texto y tablas usando PyMuPDF - GRATIS y muy eficiente."""
    print(f"🔍 Extrayendo con PyMuPDF: {archivo_pdf}", file=sys.stderr)
    
    try:
        texto_completo = ""
        tablas_detectadas = []
        
        doc = fitz.open(archivo_pdf)
        
        for i, page in enumerate(doc, 1):
            print(f"   📄 Procesando página {i}", file=sys.stderr)
            
            # Extraer texto normal
            texto_pagina = page.get_text()
            if texto_pagina.strip():
                texto_completo += f"\n=== PÁGINA {i} ===\n{texto_pagina}\n"
            
            # Extraer tablas automáticamente
            try:
                tablas = page.find_tables()
                if tablas:
                    for j, tabla in enumerate(tablas):
                        tabla_extraida = tabla.extract()
                        if tabla_extraida:
                            # Convertir tabla a texto estructurado
                            tabla_texto = ""
                            for fila in tabla_extraida:
                                if fila and any(str(celda).strip() for celda in fila if celda):
                                    fila_limpia = [str(celda).strip() if celda else "" for celda in fila]
                                    tabla_texto += "\t".join(fila_limpia) + "\n"
                            
                            if tabla_texto.strip():
                                tablas_detectadas.append(tabla_texto)
                                texto_completo += f"\n=== TABLA {j+1} PÁGINA {i} (PYMUPDF) ===\n{tabla_texto}\n"
                                print(f"   📊 Tabla {j+1} extraída de página {i} ({len(tabla_extraida)} filas)", file=sys.stderr)
            
            except Exception as e:
                print(f"   ⚠️  Error extrayendo tablas de página {i}: {e}", file=sys.stderr)
        
        doc.close()
        print(f"✅ PyMuPDF: {len(tablas_detectadas)} tablas estructuradas extraídas", file=sys.stderr)
        return texto_completo
        
    except Exception as e:
        print(f"❌ Error con PyMuPDF: {e}", file=sys.stderr)
        return None

def extraer_con_pymupdf_avanzado(archivo_pdf):
    """Extracción avanzada con PyMuPDF: texto, tablas y metadatos."""
    print(f"🚀 Extracción avanzada con PyMuPDF: {archivo_pdf}", file=sys.stderr)
    
    try:
        texto_completo = ""
        tablas_detectadas = []
        metadatos_encontrados = []
        
        doc = fitz.open(archivo_pdf)
        
        # Extraer metadatos del documento
        metadata = doc.metadata
        if metadata:
            for key, value in metadata.items():
                if value and str(value).strip():
                    metadatos_encontrados.append(f"{key}: {value}")
                    texto_completo += f"METADATA_{key}: {value}\n"
        
        for i, page in enumerate(doc, 1):
            print(f"   📄 Procesando página {i} (método avanzado)", file=sys.stderr)
            
            # Extraer texto con información de posición
            bloques_texto = page.get_text("dict")
            texto_pagina = ""
            
            for bloque in bloques_texto.get("blocks", []):
                if "lines" in bloque:  # Bloque de texto
                    for linea in bloque["lines"]:
                        texto_linea = ""
                        for span in linea.get("spans", []):
                            texto_span = span.get("text", "")
                            if texto_span.strip():
                                # Detectar texto en mayúsculas (posibles títulos/folios)
                                if texto_span.isupper() and len(texto_span) > 3:
                                    texto_linea += f"[TITULO: {texto_span}] "
                                else:
                                    texto_linea += texto_span + " "
                        
                        if texto_linea.strip():
                            texto_pagina += texto_linea.strip() + "\n"
            
            if texto_pagina.strip():
                texto_completo += f"\n=== PÁGINA {i} (AVANZADA) ===\n{texto_pagina}\n"
            
            # Extraer tablas con configuración optimizada
            try:
                # Buscar tablas con diferentes estrategias
                tablas = page.find_tables(
                    vertical_strategy="lines_strict",
                    horizontal_strategy="lines_strict"
                )
                
                if not tablas:  # Si no encuentra con líneas estrictas, usar texto
                    tablas = page.find_tables(
                        vertical_strategy="text",
                        horizontal_strategy="text"
                    )
                
                for j, tabla in enumerate(tablas):
                    tabla_extraida = tabla.extract()
                    if tabla_extraida and len(tabla_extraida) > 1:  # Al menos 2 filas
                        tabla_texto = ""
                        filas_validas = 0
                        
                        for fila in tabla_extraida:
                            if fila and any(str(celda).strip() for celda in fila if celda):
                                fila_limpia = []
                                for celda in fila:
                                    celda_str = str(celda).strip() if celda else ""
                                    # Detectar números que podrían ser precios
                                    if re.match(r'^\$?\d{1,3}(?:,\d{3})*(?:\.\d{2})?$', celda_str):
                                        fila_limpia.append(f"[PRECIO: {celda_str}]")
                                    else:
                                        fila_limpia.append(celda_str)
                                
                                tabla_texto += "\t".join(fila_limpia) + "\n"
                                filas_validas += 1
                        
                        if filas_validas >= 2:  # Tabla válida
                            tablas_detectadas.append(tabla_texto)
                            texto_completo += f"\n=== TABLA {j+1} PÁGINA {i} (PYMUPDF-ADV) ===\n{tabla_texto}\n"
                            print(f"   📊 Tabla {j+1} extraída: {filas_validas} filas válidas", file=sys.stderr)
            
            except Exception as e:
                print(f"   ⚠️  Error extrayendo tablas de página {i}: {e}", file=sys.stderr)
        
        doc.close()
        
        print(f"✅ PyMuPDF Avanzado: {len(tablas_detectadas)} tablas, {len(metadatos_encontrados)} metadatos", file=sys.stderr)
        return texto_completo
        
    except Exception as e:
        print(f"❌ Error con PyMuPDF avanzado: {e}", file=sys.stderr)
        return None

def extraer_texto_completo_pdf(archivo_pdf):
    """Extrae texto con método híbrido: PyMuPDF primero, luego fallbacks."""
    print(f"📄 Iniciando extracción híbrida de: {archivo_pdf}", file=sys.stderr)
    
    # MÉTODO 1: PyMuPDF Avanzado (GRATIS y muy potente)
    texto_completo = extraer_con_pymupdf_avanzado(archivo_pdf)
    if texto_completo and len(texto_completo.strip()) > 100:
        print(f"✅ Extracción exitosa con PyMuPDF Avanzado", file=sys.stderr)
        return mostrar_texto_extraido(texto_completo, "PYMUPDF AVANZADO")
    
    # MÉTODO 2: PyMuPDF Simple
    texto_completo = extraer_con_pymupdf(archivo_pdf)
    if texto_completo and len(texto_completo.strip()) > 100:
        print(f"✅ Extracción exitosa con PyMuPDF Simple", file=sys.stderr)
        return mostrar_texto_extraido(texto_completo, "PYMUPDF SIMPLE")
    
    # MÉTODO 3: pdfplumber con detección de tablas (tu método actual mejorado)
    print(f"🔄 Fallback a pdfplumber con detección de tablas...", file=sys.stderr)
    try:
        texto_completo = ""
        with pdfplumber.open(archivo_pdf) as pdf:
            for i, page in enumerate(pdf.pages, 1):
                # Texto normal
                texto = page.extract_text()
                if texto:
                    texto_completo += f"\n=== PÁGINA {i} ===\n{texto}\n"
                
                # Tablas con pdfplumber
                try:
                    tablas = page.extract_tables()
                    if tablas:
                        for j, tabla in enumerate(tablas):
                            tabla_texto = "\n".join(["\t".join([str(celda) if celda else "" for celda in fila]) for fila in tabla if fila])
                            if tabla_texto.strip():
                                texto_completo += f"\n=== TABLA {j+1} PÁGINA {i} (PDFPLUMBER) ===\n{tabla_texto}\n"
                                print(f"   📊 Tabla {j+1} extraída con pdfplumber", file=sys.stderr)
                except Exception as e:
                    print(f"   ⚠️  Error tablas pdfplumber página {i}: {e}", file=sys.stderr)
        
        if texto_completo and len(texto_completo.strip()) > 50:
            return mostrar_texto_extraido(texto_completo, "PDFPLUMBER + TABLAS")
    
    except Exception as e:
        print(f"❌ Error con pdfplumber: {e}", file=sys.stderr)
    
    # MÉTODO 4: PyPDF2 (último recurso)
    print(f"🔄 Último recurso: PyPDF2...", file=sys.stderr)
    try:
        texto_completo = ""
        with open(archivo_pdf, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            for i, page in enumerate(pdf_reader.pages, 1):
                texto_pagina = page.extract_text()
                if texto_pagina:
                    texto_completo += f"\n=== PÁGINA {i} ===\n{texto_pagina}\n"
        
        if texto_completo:
            return mostrar_texto_extraido(texto_completo, "PYPDF2")
    
    except Exception as e:
        print(f"❌ Error con PyPDF2: {e}", file=sys.stderr)
    
    return None

def mostrar_texto_extraido(texto_completo, metodo):
    """Función auxiliar para mostrar el texto extraído."""
    print(f"\n{'='*80}", file=sys.stderr)
    print(f"📄 TEXTO EXTRAÍDO DEL PDF ({metodo}):", file=sys.stderr)
    print(f"{'='*80}", file=sys.stderr)
    print(texto_completo, file=sys.stderr)
    print(f"{'='*80}", file=sys.stderr)
    print(f"🔍 Total de caracteres extraídos: {len(texto_completo)}", file=sys.stderr)
    print(f"{'='*80}\n", file=sys.stderr)
    return texto_completo

# =================== PROCESAMIENTO CON IA ===================

def procesar_documento_con_deepseek(texto_completo, nombre_archivo):
    """Envía TODO el texto del documento a DeepSeek para análisis en una sola llamada."""
    if not texto_completo or not texto_completo.strip():
        return None

    print(f"🤖 Enviando documento completo a DeepSeek...", file=sys.stderr)
    
    api_key = os.environ.get('DEEPSEEK_API_KEY')
    if not api_key:
        print("❌ ERROR: Variable de entorno DEEPSEEK_API_KEY no encontrada", file=sys.stderr)
        return None
        
    client = OpenAI(api_key=api_key, base_url="https://api.deepseek.com")

    system_prompt = """Eres un experto extractor de datos de órdenes de compra y cotizaciones.

IMPORTANTE: El documento puede contener elementos estructurados marcados como:
- "=== TABLA X PÁGINA Y (PYMUPDF) ===" - Tablas extraídas con PyMuPDF
- "[TITULO: TEXTO]" - Títulos/encabezados detectados
- "[PRECIO: $1,234.56]" - Precios identificados automáticamente
- "METADATA_Campo: valor" - Metadatos del PDF

PRIORIDAD DE EXTRACCIÓN:
1. Las tablas PYMUPDF contienen productos estructurados - MÁXIMA PRIORIDAD
2. Los títulos en mayúsculas pueden contener folios
3. Los precios marcados son datos críticos
4. Los metadatos pueden tener información del documento

EXTRAE ÚNICAMENTE:

1. **folioOriginal**: Identificador principal
   - Busca en títulos, metadatos y encabezados
   - Formatos: "369709", "OC-123456", "Cot. 45678"

2. **productos**: TODOS los productos sin excepción
   Estructura por producto:
   {
     "cantidad": number,
     "codigo": string,
     "descripcion": string,
     "precioUnitario": number,
     "importe": number
   }

3. **totales**: Totales del documento
   {
     "subtotal": number,
     "iva": number,
     "total": number
   }

REGLAS CRÍTICAS:
1. Las tablas PYMUPDF son PRIORITARIAS - extraer todos sus productos
2. Los números marcados como [PRECIO: $X] son datos confiables
3. Los títulos [TITULO: X] pueden contener folios importantes
4. Números decimales puros: 1234.56 (sin símbolos)
5. JSON válido únicamente

Ejemplo:
{
  "folioOriginal": "369709",
  "productos": [
    {"cantidad": 2, "codigo": "F-123", "descripcion": "Cable UTP", "precioUnitario": 150.00, "importe": 300.00}
  ],
  "totales": {"subtotal": 300.00, "iva": 48.00, "total": 348.00}
}"""

    user_prompt = f'Extrae del documento "{nombre_archivo}" ÚNICAMENTE: folioOriginal, productos (TODOS sin excepción), y totales. Documento:\n\n{texto_completo}'

    try:
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            stream=False,
            temperature=0.0,  # Temperatura 0 para máxima consistencia
            max_tokens=6144,  # Optimizado para solo productos, folio y totales
            timeout=90        # Reducido a 90 segundos
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

        # Validar JSON y estructura esencial
        json_parseado = json.loads(resultado_str)
        print(f"   ✓ Documento analizado por IA.", file=sys.stderr)
        
        # Validar que se extrajeron los campos esenciales
        folio = json_parseado.get('folioOriginal')
        productos = json_parseado.get('productos', [])
        totales = json_parseado.get('totales', {})
        
        print(f"   � Folio extraído: {folio}", file=sys.stderr)
        print(f"   �📊 Productos extraídos: {len(productos)}", file=sys.stderr)
        print(f"   💰 Totales extraídos: {len(totales)} campos", file=sys.stderr)
        
        # Advertencias de calidad
        if not folio:
            print(f"   ⚠️  ADVERTENCIA: No se detectó folio", file=sys.stderr)
        if len(productos) < 5:
            print(f"   ⚠️  ADVERTENCIA: Solo {len(productos)} productos extraídos", file=sys.stderr)
        if len(totales) < 2:
            print(f"   ⚠️  ADVERTENCIA: Totales incompletos ({len(totales)} campos)", file=sys.stderr)
        
        return resultado_str
        
    except Exception as e:
        print(f"⚠️  Error analizando documento con DeepSeek: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        return None

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
        # PASO 1: Extraer TODO el texto del PDF
        texto_completo = extraer_texto_completo_pdf(archivo_pdf)
        if not texto_completo:
            print("❌ No se pudo extraer texto del PDF.", file=sys.stderr)
            sys.exit(1)

        # PASO 2: Procesar el documento completo con DeepSeek
        json_resultado = procesar_documento_con_deepseek(texto_completo, os.path.basename(archivo_pdf))
        
        if not json_resultado:
            print("❌ El procesamiento con IA no arrojó resultados válidos.", file=sys.stderr)
            sys.exit(1)

        # PASO 3: Mostrar y guardar el resultado final
        print(json_resultado)  # Imprimir en stdout
        
        folio_extraido = None
        num_productos = 0
        num_totales = 0
        
        try:
            json_final_parseado = json.loads(json_resultado)
            folio_extraido = json_final_parseado.get('folioOriginal')
            productos = json_final_parseado.get('productos', [])
            totales = json_final_parseado.get('totales', {})
            
            num_productos = len(productos)
            num_totales = len(totales)
            
            print(f"📋 Folio detectado: {folio_extraido or 'NO DETECTADO'}", file=sys.stderr)
            print(f"📊 Total de productos extraídos: {num_productos}", file=sys.stderr)
            print(f"💰 Total de campos de totales: {num_totales}", file=sys.stderr)
            
            # Validaciones de calidad optimizadas
            if not folio_extraido:
                print(f"⚠️  ADVERTENCIA: No se detectó folio en el documento", file=sys.stderr)
            
            if num_productos < 10:
                print(f"⚠️  ADVERTENCIA: Solo se extrajeron {num_productos} productos. ¿Es correcto?", file=sys.stderr)
            
            if num_totales < 2:
                print(f"⚠️  ADVERTENCIA: Totales incompletos. Solo {num_totales} campos detectados", file=sys.stderr)
            
            # Mostrar resumen de campos de totales encontrados
            if totales:
                campos_totales = list(totales.keys())
                print(f"💱 Campos de totales encontrados: {', '.join(campos_totales)}", file=sys.stderr)
                
        except Exception as e:
            print(f"⚠️  Error al parsear JSON final: {e}", file=sys.stderr)

        archivo_guardado = guardar_json_resultado(
            json_resultado, 
            folio_extraido, 
            os.path.basename(archivo_pdf)
        )

        if archivo_guardado:
            print(f"✅ Proceso completado exitosamente.", file=sys.stderr)
    
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