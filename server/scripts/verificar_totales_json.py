#!/usr/bin/env python3
"""
Script de prueba rápida para verificar extracción de totales
Ejecuta la extracción en un archivo JSON ya generado para verificar campos
"""

import os
import sys
import json

def verificar_json_existente(ruta_json):
    """
    Verifica los campos de totales en un JSON ya generado
    """
    try:
        with open(ruta_json, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        print(f"📄 Verificando: {os.path.basename(ruta_json)}")
        print("=" * 50)
        
        # Verificar folioOriginal
        folio = data.get('folioOriginal')
        print(f"📋 folioOriginal: {folio}")
        
        # Verificar totales
        totales = data.get('totales', {})
        if totales:
            print(f"💰 Totales encontrados ({len(totales)} campos):")
            for campo, valor in totales.items():
                print(f"   {campo}: {valor}")
        else:
            print("❌ No se encontraron totales")
        
        # Verificar productos
        productos = data.get('productos', [])
        print(f"📦 Productos: {len(productos)}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    """
    Verificar archivos JSON en resultados_json
    """
    script_dir = os.path.dirname(__file__)
    resultados_dir = os.path.join(script_dir, 'resultados_json')
    
    if not os.path.exists(resultados_dir):
        print(f"❌ Directorio no encontrado: {resultados_dir}")
        return
    
    archivos_json = [f for f in os.listdir(resultados_dir) if f.endswith('.json')]
    
    if not archivos_json:
        print(f"❌ No se encontraron archivos JSON en: {resultados_dir}")
        return
    
    print(f"🔍 Verificando {len(archivos_json)} archivos JSON:")
    print("=" * 60)
    
    for archivo in archivos_json:
        ruta_completa = os.path.join(resultados_dir, archivo)
        verificar_json_existente(ruta_completa)
        print()

if __name__ == "__main__":
    main()