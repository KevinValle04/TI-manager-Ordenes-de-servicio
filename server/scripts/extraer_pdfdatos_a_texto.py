#!/usr/bin/env python3
"""
Script Universal para Extracción de TEXTO de Cotizaciones/Órdenes de Compra
Extrae únicamente el texto plano del PDF sin estructuración JSON.

Uso: python extraer_datos_universal_openia.py <archivo_pdf>
"""

import pdfplumber
import PyPDF2
import sys
import os

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

# =================== ENTRADA PRINCIPAL ===================
if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("❌ ERROR: Se requiere la ruta del archivo PDF como argumento", file=sys.stderr)
        print("Uso: python extraer_datos_universal_openia.py <archivo_pdf>", file=sys.stderr)
        sys.exit(1)
    
    archivo_pdf = sys.argv[1]
    
    if not os.path.exists(archivo_pdf):
        print(f"❌ Error: El archivo {archivo_pdf} no existe", file=sys.stderr)
        sys.exit(1)
    
    try:
        # Extraer solo el texto del PDF
        print(f"🔍 Iniciando extracción de: {os.path.basename(archivo_pdf)}", file=sys.stderr)
        texto = extraer_texto_pdf(archivo_pdf)
        
        if texto.strip():
            # Imprimir el texto plano en stdout
            print(texto)
            print(f"✅ TEXTO EXTRAÍDO EXITOSAMENTE ({len(texto)} caracteres)", file=sys.stderr)
        else:
            print("❌ No se pudo extraer texto del archivo", file=sys.stderr)
            sys.exit(1)
    
    except Exception as e:
        print(f"❌ ERROR CRÍTICO: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)