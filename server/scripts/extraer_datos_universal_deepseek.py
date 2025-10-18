#!/usr/bin/env python3
"""
Script Universal para Extracción y Análisis de Cotizaciones/Órdenes de Compra
Extrae texto del PDF y lo procesa con DeepSeek AI para estructurar los datos.

Requisitos:
- pip install openai pdfplumber PyPDF2
- Variable de entorno: DEEPSEEK_API_KEY

Uso: python extraer_datos_universal_deepseek.py <archivo_pdf>
"""

import pdfplumber
import PyPDF2
import sys
import os
import json
import re
from openai import OpenAI

# Cargar variables de entorno desde archivo .env
def cargar_env():
    """Carga variables desde el archivo .env del proyecto"""
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                if '=' in line and not line.strip().startswith('#'):
                    key, value = line.strip().split('=', 1)
                    os.environ[key] = value
        print(f"✅ Variables cargadas desde: {env_path}", file=sys.stderr)
    else:
        print(f"⚠️  Archivo .env no encontrado en: {env_path}", file=sys.stderr)

def extraer_texto_pdf(archivo_pdf):
    """
    Extrae texto del PDF usando múltiples métodos
    Devuelve el texto plano completo sin procesamiento
    """
    texto_completo = ""
    
    print(f"📄 Extrayendo texto de: {archivo_pdf}", file=sys.stderr)
    
    # Método 1: pdfplumber (mejor para tablas)
    try:
        with pdfplumber.open(archivo_pdf) as pdf:
            print(f"📖 PDF tiene {len(pdf.pages)} página(s)", file=sys.stderr)
            
            for i, page in enumerate(pdf.pages, 1):
                print(f"   Procesando página {i}...", file=sys.stderr)
                texto_pagina = page.extract_text()
                if texto_pagina:
                    texto_completo += f"\n=== PÁGINA {i} ===\n"
                    texto_completo += texto_pagina + "\n"
                    
    except Exception as e:
        print(f"❌ Error con pdfplumber: {e}", file=sys.stderr)
        print("⚠️  Intentando con PyPDF2...", file=sys.stderr)
        
        # Método 2: PyPDF2 (fallback)
        try:
            with open(archivo_pdf, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                print(f"📖 PDF tiene {len(pdf_reader.pages)} página(s)", file=sys.stderr)
                
                for i, page in enumerate(pdf_reader.pages, 1):
                    print(f"   Procesando página {i}...", file=sys.stderr)
                    texto_pagina = page.extract_text()
                    if texto_pagina:
                        texto_completo += f"\n=== PÁGINA {i} ===\n"
                        texto_completo += texto_pagina + "\n"
                        
        except Exception as e2:
            print(f"❌ Error con PyPDF2: {e2}", file=sys.stderr)
            return ""
    
    caracteres_extraidos = len(texto_completo.strip())
    print(f"✅ Extracción completada: {caracteres_extraidos} caracteres", file=sys.stderr)
    
    return texto_completo

def procesar_con_deepseek(texto_completo, nombre_archivo):
    """
    Envía el texto extraído a DeepSeek para análisis y estructuración
    """
    try:
        print(f"🤖 Enviando texto a DeepSeek para análisis...", file=sys.stderr)
        
        # Configurar cliente DeepSeek
        api_key = os.environ.get('DEEPSEEK_API_KEY')
        if not api_key:
            print("❌ ERROR: Variable de entorno DEEPSEEK_API_KEY no encontrada", file=sys.stderr)
            return None
            
        client = OpenAI(
            api_key=api_key, 
            base_url="https://api.deepseek.com"
        )
        
        # Prompt para estructurar datos de orden de compra
        system_prompt = """Eres un experto en análisis de órdenes de compra y cotizaciones. 
Tu tarea es extraer y estructurar la información clave del texto de PDF en formato JSON.

¡PRIORIDAD MÁXIMA! Asegúrate de incluir TODOS los productos hasta el final del documento.

Extrae la siguiente información:
- folioOriginal: ¡EXTREMADAMENTE CRÍTICO! Extraer el número de folio/orden/cotización COMPLETO Y EXACTO tal como aparece en el texto
  * Buscar palabras clave: "FOLIO:", "Folio", "COTIZACIÓN", "No.", "Número", "ORDEN"
  * Usar el número COMPLETO sin recortar ni abreviar (ejemplo: si dice "5PSCGH9214025" usar exactamente "5PSCGH9214025")
  * NO tomar solo una parte del número (como "21106" de "5PSCGH9214025")
  * Usar el texto LITERAL y COMPLETO del documento
- fecha: fecha del documento (formato YYYY-MM-DD)
- productos: ¡CRÍTICO! Lista COMPLETA de TODOS los productos:
  * Incluir CADA PRODUCTO sin excepción, incluso si son muchos
  * Usar nombres de columnas EXACTOS del texto
  * Si hay 37 productos, el JSON debe tener 37 productos
  * Verificar que llegues hasta el ÚLTIMO producto de la tabla
  * Campos comunes: cantidad, unidad, codigo, descripcion, precioLista, descuentos, precioUnitario, importe
  * ¡IMPORTANTE! Para campos numéricos (precios, cantidades, importes): usar SOLO números decimales sin comas ni símbolos de moneda
  * Ejemplo: usar 5303.90 en lugar de "5,303.90" o "$5,303.90"
  * Si hay descuentos, mantener el formato de texto original (ej: "10.8557% 24% 23%")
  * ¡CRÍTICO! Si no encuentras "precioUnitario", buscar "precio", "precioNeto", "precioFinal", o cualquier precio disponible
  * Si un producto no tiene precio visible, poner 0 pero NO omitir el producto
- totales: ¡EXTREMADAMENTE CRÍTICO! Extraer TODOS los totales disponibles en el documento:
  * Buscar secciones de totales al final del documento
  * Campos comunes: "Subtotal", "SUB-TOTAL", "IVA", "16% IVA", "8% I.V.A.", "TOTAL", "Total"
  * ¡IMPORTANTE! Para importes usar SOLO números decimales sin comas ni símbolos de moneda
  * Ejemplo: usar 22592.11 en lugar de "$22,592.11" o "22,592.11"
  * Incluir EXACTAMENTE los nombres de campos como aparecen en el texto
  * Si no encuentras totales explícitos, calcularlos de los productos

REGLAS CRÍTICAS:
1. COMPLETITUD: Incluir TODOS los productos hasta el final
2. FIDELIDAD: Usar nombres de campos exactos del texto
3. FOLIO COMPLETO: Extraer el folio EXACTAMENTE como aparece, SIN RECORTAR ni tomar solo una parte
4. TOTALES COMPLETOS: Extraer TODOS los totales con nombres exactos del documento
5. NO agregar campos inexistentes
6. Si tienes límite de espacio, prioriza completar la lista de productos
7. Es mejor un JSON con todos los productos que uno incompleto

ESTRUCTURA ESPERADA para productos:
{
  "cantidad": 1,
  "unidad": "PIEZA", 
  "codigo": "ABC123",
  "descripcion": "DESCRIPCION DEL PRODUCTO",
  "precioLista": 1000.50,
  "descuentos": "10% 5%",
  "precioUnitario": 850.25,
  "importe": 850.25
}

ESTRUCTURA ESPERADA para totales (usar nombres exactos del documento):
{
  "SUB-TOTAL": 282401.41,
  "8% I.V.A.": 22592.11,
  "TOTAL": 304993.52
}

¡ATENCIÓN ESPECIAL PARA TOTALES!
- Buscar sección de totales al final del documento después de la tabla de productos
- Incluir TODOS los conceptos de totales que aparezcan
- Respetar nombres exactos como aparecen en el texto ("SUB-TOTAL", "8% I.V.A.", etc.)
- Convertir importes a números decimales puros sin comas ni símbolos

IMPORTANTE: Responde ÚNICAMENTE con el JSON válido, SIN marcadores de código como ```json o ```. Solo el JSON puro."""

        user_prompt = f"""Analiza este texto extraído del PDF "{nombre_archivo}" y extrae la información estructurada:

{texto_completo}"""

        # Llamada a DeepSeek
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            stream=False,
            temperature=0.1,  # Más determinista para extracción de datos
            max_tokens=8000,  # Aumentar límite de tokens
            timeout=120       # Aumentar timeout a 2 minutos
        )
        
        resultado = response.choices[0].message.content
        print(f"✅ Análisis de DeepSeek completado", file=sys.stderr)
        
        # Limpiar marcadores de código si existen
        if resultado.startswith('```json'):
            resultado = resultado.replace('```json', '').replace('```', '').strip()
            print(f"🧹 Marcadores de código removidos", file=sys.stderr)
        
        # Validar si el JSON está completo
        try:
            json_data = json.loads(resultado)
            num_productos = len(json_data.get('productos', []))
            print(f"📊 Productos extraídos: {num_productos}", file=sys.stderr)
            
            # Verificar si el JSON parece cortado
            if not resultado.strip().endswith('}'):
                print(f"⚠️  ADVERTENCIA: El JSON parece estar incompleto", file=sys.stderr)
            
        except json.JSONDecodeError:
            print(f"⚠️  ADVERTENCIA: Respuesta no es JSON válido", file=sys.stderr)
        
        return resultado
        
    except Exception as e:
        print(f"❌ Error al procesar con DeepSeek: {str(e)}", file=sys.stderr)
        return None

def guardar_json_resultado(json_resultado, folio_original, nombre_archivo_original):
    """
    Guarda el resultado JSON en un archivo con el número de orden
    """
    try:
        # Crear directorio de resultados si no existe
        directorio_resultados = os.path.join(os.path.dirname(__file__), 'resultados_json')
        if not os.path.exists(directorio_resultados):
            os.makedirs(directorio_resultados)
            print(f"📁 Directorio creado: {directorio_resultados}", file=sys.stderr)
        
        # Determinar nombre del archivo usando el folio original
        if folio_original and folio_original.strip():
            # Limpiar el folio de caracteres especiales
            folio_limpio = re.sub(r'[<>:"/\\|?*\s]', '_', str(folio_original).strip())
            nombre_archivo = f"orden_{folio_limpio}.json"
            print(f"📄 Usando folio para nombre: {folio_limpio}", file=sys.stderr)
        else:
            # Fallback: usar nombre del PDF original si no hay folio
            base_name = os.path.splitext(nombre_archivo_original)[0]
            base_name_limpio = re.sub(r'[<>:"/\\|?*\s]', '_', base_name)
            nombre_archivo = f"orden_{base_name_limpio}.json"
            print(f"⚠️  Sin folio, usando nombre PDF: {base_name_limpio}", file=sys.stderr)
        
        ruta_completa = os.path.join(directorio_resultados, nombre_archivo)
        
        # Guardar el JSON
        with open(ruta_completa, 'w', encoding='utf-8') as f:
            # Intentar parsear y formatear el JSON para que esté bien estructurado
            try:
                json_parseado = json.loads(json_resultado)
                json.dump(json_parseado, f, indent=2, ensure_ascii=False)
            except json.JSONDecodeError:
                # Si no es JSON válido, guardar como texto
                f.write(json_resultado)
        
        print(f"💾 JSON guardado en: {ruta_completa}", file=sys.stderr)
        return ruta_completa
        
    except Exception as e:
        print(f"❌ Error al guardar JSON: {str(e)}", file=sys.stderr)
        return None

# =================== ENTRADA PRINCIPAL ===================
if __name__ == "__main__":
    # Cargar variables de entorno desde .env
    cargar_env()
    
    if len(sys.argv) != 2:
        print("❌ ERROR: Se requiere la ruta del archivo PDF como argumento", file=sys.stderr)
        print("Uso: python extraer_datos_universal_deepseek.py <archivo_pdf>", file=sys.stderr)
        sys.exit(1)
    
    archivo_pdf = sys.argv[1]
    
    if not os.path.exists(archivo_pdf):
        print(f"❌ Error: El archivo {archivo_pdf} no existe", file=sys.stderr)
        sys.exit(1)
    
    try:
        # PASO 1: Extraer el texto del PDF (igual que extraer_pdfdatos_a_texto.py)
        print(f"🔍 Iniciando extracción de: {os.path.basename(archivo_pdf)}", file=sys.stderr)
        texto = extraer_texto_pdf(archivo_pdf)
        
        if texto.strip():
            print(f"✅ Texto extraído ({len(texto)} caracteres)", file=sys.stderr)
            
            # PASO 2: Procesar con DeepSeek para convertir a JSON
            resultado_deepseek = procesar_con_deepseek(texto, os.path.basename(archivo_pdf))
            
            if resultado_deepseek:
                # Extraer folio ANTES de imprimir para usar en el nombre del archivo
                folio_extraido = None
                try:
                    json_parseado = json.loads(resultado_deepseek)
                    folio_extraido = json_parseado.get('folioOriginal')
                    totales_extraidos = json_parseado.get('totales', {})
                    num_productos = len(json_parseado.get('productos', []))
                    
                    print(f"📋 Folio detectado: {folio_extraido}", file=sys.stderr)
                    print(f"📊 Productos extraídos: {num_productos}", file=sys.stderr)
                    print(f"💰 Totales extraídos: {list(totales_extraidos.keys()) if totales_extraidos else 'Ninguno'}", file=sys.stderr)
                    
                    if totales_extraidos:
                        for campo, valor in totales_extraidos.items():
                            print(f"   {campo}: {valor}", file=sys.stderr)
                            
                except Exception as e:
                    print(f"⚠️  No se pudo extraer información: {e}", file=sys.stderr)
                
                # Imprimir resultado estructurado de DeepSeek en stdout
                print(resultado_deepseek)
                
                # Guardar JSON en archivo usando el folio original
                archivo_guardado = guardar_json_resultado(
                    resultado_deepseek, 
                    folio_extraido, 
                    os.path.basename(archivo_pdf)
                )
                
                if archivo_guardado:
                    print(f"✅ Procesamiento completo. Archivo guardado: {os.path.basename(archivo_guardado)}", file=sys.stderr)
                
            else:
                # Fallback: imprimir texto plano si DeepSeek falla
                print("⚠️ DeepSeek no disponible, mostrando texto plano:", file=sys.stderr)
                print(texto)
        else:
            print("❌ No se pudo extraer texto del archivo", file=sys.stderr)
            sys.exit(1)
    
    except Exception as e:
        print(f"❌ ERROR CRÍTICO: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)