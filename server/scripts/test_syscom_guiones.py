#!/usr/bin/env python3
"""
Script de prueba para verificar el procesamiento de códigos con guiones en Syscom
"""

import sys
import os
import re

# Importar la función desde el script principal
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def procesar_codigo_con_guiones(codigo):
    """
    Procesa códigos de producto de Syscom que contienen guiones.
    Si el código contiene solo guiones (ej: "TIJ -- -- -- --"), 
    los reemplaza con ceros para crear un código válido.
    
    Args:
        codigo (str): Código original del producto
    
    Returns:
        str: Código procesado
    """
    if not codigo:
        return codigo
    
    # Detectar patrones con guiones (ej: "TIJ -- -- -- --")
    if '--' in codigo:
        print(f"  Detectado código con guiones: {codigo}")
        
        # Reemplazar guiones dobles con ceros
        codigo_procesado = re.sub(r'--', '00', codigo)
        # Eliminar espacios extras
        codigo_procesado = re.sub(r'\s+', '', codigo_procesado)
        
        print(f"  Código procesado: {codigo} -> {codigo_procesado}")
        return codigo_procesado
    
    return codigo

def test_codigos_syscom():
    """Ejecuta pruebas con diferentes tipos de códigos Syscom"""
    
    print("🧪 PRUEBAS DE PROCESAMIENTO DE CÓDIGOS SYSCOM")
    print("=" * 50)
    
    # Casos de prueba
    casos_prueba = [
        "TIJ -- -- -- --",           # Caso reportado
        "ABC -- -- XYZ",             # Caso parcial
        "46171619",                   # Código normal sin guiones
        "DEF--GHI--JKL",             # Sin espacios
        "MNO -- PQR -- STU",         # Múltiples guiones
        "",                          # Caso vacío
        None,                        # Caso nulo
        "XYZ123",                    # Código alfanumérico normal
    ]
    
    for i, codigo_original in enumerate(casos_prueba, 1):
        print(f"\n🔍 Caso {i}: {repr(codigo_original)}")
        
        try:
            codigo_procesado = procesar_codigo_con_guiones(codigo_original)
            print(f"   ✅ Resultado: {repr(codigo_procesado)}")
            
            # Verificaciones adicionales
            if codigo_original and '--' in str(codigo_original):
                if '--' not in codigo_procesado:
                    print(f"   ✅ Los guiones fueron removidos correctamente")
                else:
                    print(f"   ❌ Aún quedan guiones en el resultado")
                    
                if ' ' not in codigo_procesado:
                    print(f"   ✅ Los espacios fueron removidos correctamente")
                else:
                    print(f"   ❌ Aún quedan espacios en el resultado")
                    
        except Exception as e:
            print(f"   ❌ Error: {e}")
    
    print("\n" + "=" * 50)
    print("🏁 Pruebas completadas")

def test_ejemplo_especifico():
    """Prueba específica para el caso reportado"""
    
    print("\n🎯 PRUEBA ESPECÍFICA - CASO REPORTADO")
    print("=" * 50)
    
    # Datos del ejemplo específico
    producto_ejemplo = {
        "cantidad": 2,
        "unidad": "PIEZA",
        "codigo_original": "TIJ -- -- -- --",
        "descripcion": "ACCESSDC CIERRA PUERTAS 40-65KGS",
        "clave_producto": "46171619"
    }
    
    print(f"📦 Producto: {producto_ejemplo['cantidad']} {producto_ejemplo['unidad']}")
    print(f"📝 Descripción: {producto_ejemplo['descripcion']}")
    print(f"🔑 Clave Producto: {producto_ejemplo['clave_producto']}")
    print(f"🏷️  Código Original: {repr(producto_ejemplo['codigo_original'])}")
    
    # Procesar el código
    codigo_procesado = procesar_codigo_con_guiones(producto_ejemplo['codigo_original'])
    
    print(f"🔄 Código Procesado: {repr(codigo_procesado)}")
    
    # Verificación final
    if codigo_procesado == "TIJ00000000":
        print("✅ El código fue procesado correctamente según la especificación")
    else:
        print(f"❌ El código no coincide con lo esperado: 'TIJ00000000'")
    
    print("=" * 50)

if __name__ == "__main__":
    test_codigos_syscom()
    test_ejemplo_especifico()