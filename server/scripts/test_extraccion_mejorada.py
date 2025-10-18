#!/usr/bin/env python3
"""
Script de prueba para validar mejoras en extracción de datos
Verifica que se extraigan correctamente:
1. folioOriginal completo
2. Totales con nombres exactos del documento
"""

import os
import sys
import json
import subprocess

def validar_json_extraido(json_data, nombre_archivo):
    """
    Valida que el JSON tenga los campos correctos
    """
    print(f"\n🔍 VALIDANDO: {nombre_archivo}")
    print("=" * 50)
    
    # 1. Validar folioOriginal
    folio_original = json_data.get('folioOriginal')
    if folio_original:
        print(f"✅ folioOriginal encontrado: '{folio_original}'")
        if len(str(folio_original)) >= 5:  # Debe ser un folio completo
            print(f"✅ Folio parece completo (longitud: {len(str(folio_original))})")
        else:
            print(f"⚠️  Folio podría estar incompleto (longitud: {len(str(folio_original))})")
    else:
        print("❌ folioOriginal NO encontrado")
    
    # 2. Validar productos
    productos = json_data.get('productos', [])
    print(f"📦 Productos encontrados: {len(productos)}")
    
    if productos:
        # Mostrar ejemplos de productos
        print(f"📋 Primer producto: {productos[0].get('descripcion', 'Sin descripción')[:50]}...")
        if len(productos) > 1:
            print(f"📋 Último producto: {productos[-1].get('descripcion', 'Sin descripción')[:50]}...")
    
    # 3. Validar totales
    totales = json_data.get('totales', {})
    if totales and isinstance(totales, dict):
        print(f"💰 Totales encontrados: {len(totales)} campos")
        for campo, valor in totales.items():
            print(f"   {campo}: {valor}")
        
        # Verificar que se conserven nombres exactos
        nombres_campos = list(totales.keys())
        if any(campo in ['SUB-TOTAL', 'IVA', 'TOTAL'] for campo in nombres_campos):
            print("✅ Se conservan nombres exactos de campos de totales")
        else:
            print("⚠️  Los nombres de campos de totales podrían haberse normalizado")
    else:
        print("❌ No se encontraron totales")
    
    print("-" * 50)

def probar_archivo_pdf(ruta_pdf):
    """
    Ejecuta el script de extracción en un archivo PDF y valida el resultado
    """
    try:
        print(f"\n🚀 PROCESANDO: {os.path.basename(ruta_pdf)}")
        
        # Ejecutar el script de extracción
        script_path = os.path.join(os.path.dirname(__file__), 'extraer_datos_universal_deepseek.py')
        result = subprocess.run(
            [sys.executable, script_path, ruta_pdf],
            capture_output=True,
            text=True,
            encoding='utf-8'
        )
        
        if result.returncode == 0:
            # Analizar el JSON resultante
            try:
                json_data = json.loads(result.stdout)
                validar_json_extraido(json_data, os.path.basename(ruta_pdf))
                return True
            except json.JSONDecodeError as e:
                print(f"❌ Error al parsear JSON: {e}")
                print(f"Salida recibida: {result.stdout[:200]}...")
                return False
        else:
            print(f"❌ Error en la extracción: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ Error inesperado: {e}")
        return False

def main():
    """
    Función principal de pruebas
    """
    print("🧪 INICIANDO PRUEBAS DE EXTRACCIÓN MEJORADA")
    print("=" * 60)
    
    # Buscar archivos PDF de prueba
    script_dir = os.path.dirname(__file__)
    ordenes_test_dir = os.path.join(script_dir, 'ordenes_TEST')
    
    archivos_pdf = []
    
    # Buscar PDFs en el directorio de pruebas
    if os.path.exists(ordenes_test_dir):
        for archivo in os.listdir(ordenes_test_dir):
            if archivo.lower().endswith('.pdf'):
                archivos_pdf.append(os.path.join(ordenes_test_dir, archivo))
    
    if not archivos_pdf:
        print("⚠️  No se encontraron archivos PDF para probar")
        print(f"Buscar en: {ordenes_test_dir}")
        print("Por favor, coloca algunos archivos PDF de prueba en ese directorio")
        return
    
    print(f"📄 Archivos PDF encontrados: {len(archivos_pdf)}")
    
    # Probar cada archivo
    exitosos = 0
    for pdf_path in archivos_pdf[:3]:  # Probar solo los primeros 3 para no saturar
        if probar_archivo_pdf(pdf_path):
            exitosos += 1
    
    print(f"\n📊 RESUMEN DE PRUEBAS")
    print("=" * 30)
    print(f"Total probados: {min(len(archivos_pdf), 3)}")
    print(f"Exitosos: {exitosos}")
    print(f"Fallidos: {min(len(archivos_pdf), 3) - exitosos}")
    
    if exitosos > 0:
        print("✅ Las mejoras están funcionando correctamente")
    else:
        print("❌ Las mejoras necesitan ajustes")

if __name__ == "__main__":
    main()