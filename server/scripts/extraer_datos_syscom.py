#!/usr/bin/env python3
import pdfplumber
import re
import json
import sys
import os

def extraer_datos(path_pdf):
    productos = []
    texto_completo = ""
    
    with pdfplumber.open(path_pdf) as pdf:
        print(f"Procesando PDF con {len(pdf.pages)} páginas...", file=sys.stderr)
        
        # Procesar cada página individualmente
        for page_num, page in enumerate(pdf.pages, 1):
            print(f"Procesando página {page_num}...", file=sys.stderr)
            
            # Extraer texto de la página
            page_text = page.extract_text()
            if page_text:
                texto_completo += page_text + "\n"
                
                # Extraer productos de esta página específica
                productos_pagina = extraer_productos_de_pagina(page_text, page_num)
                productos.extend(productos_pagina)
                print(f"Encontrados {len(productos_pagina)} productos en página {page_num}", file=sys.stderr)
            
            # También intentar extraer tablas de esta página
            try:
                tables = page.extract_tables()
                for table_num, table in enumerate(tables):
                    productos_tabla = procesar_tabla(table, page_num, table_num)
                    productos.extend(productos_tabla)
                    print(f"Encontrados {len(productos_tabla)} productos en tabla {table_num} de página {page_num}", file=sys.stderr)
            except Exception as e:
                print(f"Error extrayendo tablas de página {page_num}: {e}", file=sys.stderr)
    
    # Eliminar duplicados manteniendo el orden
    productos_unicos = eliminar_duplicados(productos)
    print(f"Total de productos únicos encontrados: {len(productos_unicos)}", file=sys.stderr)
    
    # Extraer otros datos del texto completo
    datos_generales = extraer_datos_generales(texto_completo)
    datos_generales["productos"] = productos_unicos
    
    return datos_generales

def extraer_productos_de_pagina(texto_pagina, page_num):
    productos = []
    lineas = texto_pagina.split('\n')
    
    # Buscar líneas que contengan productos
    patron_producto = re.compile(r'^(\d+)\s+(PIEZA|SERVICIO|KIT|BOBINA)\s+([A-Z0-9/\-\.\(\)]+)\s+(.+)', re.IGNORECASE)
    
    i = 0
    while i < len(lineas):
        linea = lineas[i].strip()
        match = patron_producto.match(linea)
        
        if match:
            cantidad = match.group(1)
            unidad = match.group(2)
            codigo = match.group(3)
            resto = match.group(4)
            
            # Extraer información adicional
            descripcion, alm, precio_lista, precio_unitario, importe = extraer_info_completa(
                resto, lineas, i, len(lineas)
            )
            
            producto = {
                "cantidad": try_int(cantidad),
                "unidad": unidad,
                "codigo": codigo,
                "descripcion": descripcion,
                "alm": alm,
                "precioLista": precio_lista,
                "precioUnitario": precio_unitario,
                "importe": importe,
                "pagina": page_num
            }
            productos.append(producto)
            print(f"  Producto encontrado: {codigo} - {descripcion[:50]}...", file=sys.stderr)
        
        i += 1
    
    return productos

def procesar_tabla(table, page_num, table_num):
    productos = []
    if not table or len(table) < 2:
        return productos
    
    print(f"  Procesando tabla {table_num} con {len(table)} filas", file=sys.stderr)
    
    # Buscar el encabezado de la tabla
    header_row = None
    for i, row in enumerate(table):
        if row and any(cell and 'CANT' in str(cell).upper() for cell in row if cell):
            header_row = i
            print(f"    Encabezado encontrado en fila {i}", file=sys.stderr)
            break
    
    if header_row is None:
        print("    No se encontró encabezado de tabla", file=sys.stderr)
        return productos
    
    # Procesar cada fila después del encabezado
    for row_num, row in enumerate(table[header_row + 1:], header_row + 2):
        if not row:
            continue
        
        # Verificar si es una fila de producto válida
        if row[0] and str(row[0]).strip().isdigit():
            producto = procesar_fila_tabla(row, page_num, row_num)
            if producto:
                productos.append(producto)
                print(f"    Producto de tabla: {producto['codigo']} - {producto['descripcion'][:30]}...", file=sys.stderr)
    
    return productos

def procesar_fila_tabla(row, page_num, row_num):
    try:
        # Asegurar que tenemos suficientes columnas
        while len(row) < 9:
            row.append(None)
        
        cantidad = str(row[0]).strip() if row[0] else ""
        unidad = str(row[1]).strip() if row[1] else ""
        codigo = str(row[2]).strip() if row[2] else ""
        descripcion = str(row[3]).strip() if row[3] else ""
        ubic = str(row[4]).strip() if row[4] else ""
        precio_lista = try_float(row[5]) if row[5] else None
        descuentos = str(row[6]).strip() if row[6] else ""
        precio_unitario = try_float(row[7]) if row[7] else None
        importe = try_float(row[8]) if row[8] else None
        
        # Limpiar descripción
        descripcion = limpiar_descripcion(descripcion)
        
        # Crear producto incluso si faltan algunos valores
        if cantidad.isdigit() and codigo:
            return {
                "cantidad": int(cantidad),
                "unidad": unidad,
                "codigo": codigo,
                "descripcion": descripcion,
                "alm": ubic,
                "precioLista": precio_lista,
                "precioUnitario": precio_unitario,
                "importe": importe,
                "descuentos": descuentos,
                "pagina": page_num,
                "fila": row_num
            }
    except Exception as e:
        print(f"    Error procesando fila {row_num}: {e}", file=sys.stderr)
    
    return None

def extraer_info_completa(resto_linea, lineas, indice_actual, total_lineas):
    # Inicializar valores por defecto
    descripcion = resto_linea
    alm = ""
    precio_lista = None
    precio_unitario = None
    importe = None
    
    # Buscar patrón de precios en la línea actual
    patron_precios = re.search(
        r'([A-Z]{2,4})\s+([\d,]+\.\d{2}|--)\s+([^$]+?)\s+([\d,]+\.\d{2}|--)\s+([\d,]+\.\d{2})$',
        resto_linea
    )
    
    if patron_precios:
        alm = patron_precios.group(1)
        precio_lista = try_float(patron_precios.group(2))
        precio_unitario = try_float(patron_precios.group(4))
        importe = try_float(patron_precios.group(5))
        descripcion = resto_linea[:patron_precios.start()].strip()
        return limpiar_descripcion(descripcion), alm, precio_lista, precio_unitario, importe
    
    # Buscar en líneas siguientes (máximo 10 líneas)
    j = indice_actual + 1
    while j < total_lineas and j < indice_actual + 10:
        siguiente_linea = lineas[j].strip()
        
        # Si encuentra otra línea de producto, parar
        if re.match(r'^\d+\s+(PIEZA|SERVICIO|KIT|BOBINA)', siguiente_linea, re.IGNORECASE):
            break
        
        # Si encuentra línea de totales, parar
        if re.search(r'SUB-TOTAL|TOTAL', siguiente_linea, re.IGNORECASE):
            break
        
        # Buscar precios en la línea siguiente
        patron_precios_sig = re.search(
            r'([A-Z]{2,4})\s+([\d,]+\.\d{2}|--)\s+([^$]+?)\s+([\d,]+\.\d{2}|--)\s+([\d,]+\.\d{2})$',
            siguiente_linea
        )
        
        if patron_precios_sig:
            alm = patron_precios_sig.group(1)
            precio_lista = try_float(patron_precios_sig.group(2))
            precio_unitario = try_float(patron_precios_sig.group(4))
            importe = try_float(patron_precios_sig.group(5))
            
            # Agregar descripción adicional si existe
            desc_adicional = siguiente_linea[:patron_precios_sig.start()].strip()
            if desc_adicional and not re.search(r'Clave Producto:', desc_adicional):
                descripcion += " " + desc_adicional
            break
        else:
            # Agregar línea a la descripción si parece ser parte de ella
            if (siguiente_linea and 
                not re.search(r'Clave Producto:', siguiente_linea) and
                not siguiente_linea.startswith('SYSCOM') and
                not siguiente_linea.startswith('COTIZACIÓN') and
                not siguiente_linea.startswith('FOLIO:') and
                len(siguiente_linea) > 3):
                descripcion += " " + siguiente_linea
        
        j += 1
    
    return limpiar_descripcion(descripcion), alm, precio_lista, precio_unitario, importe

def eliminar_duplicados(productos):
    """Eliminar productos duplicados basándose en el código"""
    vistos = set()
    productos_unicos = []
    
    for producto in productos:
        codigo = producto.get('codigo', '')
        if codigo and codigo not in vistos:
            vistos.add(codigo)
            productos_unicos.append(producto)
    
    return productos_unicos

def extraer_datos_generales(texto):
    def buscar(patron):
        match = re.search(patron, texto, re.IGNORECASE | re.MULTILINE | re.DOTALL)
        return match.group(1).strip() if match else ""

    def buscar_numero(patron):
        match = re.search(patron, texto, re.IGNORECASE | re.MULTILINE)
        if match:
            valor = match.group(1).replace(",", "").replace("$", "").strip()
            try:
                return float(valor)
            except:
                return 0.0
        return 0.0

    # Extraer datos fiscales
    datos_fiscales = ""
    match_datos = re.search(
        r"DATOS FISCALES\s*([^\n]+?)\s*RFC:", texto, re.MULTILINE | re.DOTALL
    )
    if match_datos:
        datos_fiscales = match_datos.group(1).strip()

    return {
        "folio": buscar(r"FOLIO:\s*([^\n]+)"),
        "fecha": buscar(r"FECHA:\s*([^\n]+)"),
        "datosFiscales": datos_fiscales,
        "rfc": buscar(r"RFC:\s*([A-Z0-9]{10,13})"),
        "ejecutivo": buscar(r"EJECUTIVO VENTAS:\s*([^\n]+?)(?:\s+EMAIL|\s+OBSERVACIONES|$)"),
        "email": buscar(r"EMAIL:\s*([^\s]+)"),
        "fechaVencimiento": buscar(r"FECHA DE VENCIMIENTO:\s*([^\n]+?)(?:\s*\*|$)"),
        "formaPago": buscar(r"FORMA DE PAGO:\s*([^\n]+)"),
        "usoMercancia": buscar(r"USO DE\s+MC[ÍI]A\.?:?\s*([^\n]+)"),
        "metodoPago": buscar(r"M[ÉE]TODO DE PAGO:\s*([^\n]+)"),
        "totales": {
            "subTotal": buscar_numero(r"SUB-TOTAL\s*\$?\s*([\d,]+\.?\d*)"),
            "iva": buscar_numero(r"I\.V\.A\.\s*\$?\s*([\d,]+\.?\d*)"),
            "total": buscar_numero(r"(?<!SUB-)TOTAL\s*\$?\s*([\d,]+\.?\d*)")
        }
    }

def limpiar_descripcion(descripcion):
    if not descripcion:
        return ""
    
    # Remover elementos no deseados
    descripcion = re.sub(r'Clave Producto:.*$', '', descripcion)
    descripcion = re.sub(r'"Tiempo de entrega[^"]*"', '', descripcion)
    descripcion = re.sub(r'\s+', ' ', descripcion)  # Normalizar espacios
    return descripcion.strip()

def try_float(valor):
    if not valor or valor == "--" or valor == "None":
        return None
    try:
        # Limpiar el valor
        valor_limpio = str(valor).replace(",", "").replace("$", "").strip()
        if valor_limpio and valor_limpio != "--":
            return float(valor_limpio)
    except:
        pass
    return None

def try_int(valor):
    if not valor:
        return None
    try:
        return int(str(valor).strip())
    except:
        return None

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Uso: python3 extractor_pdf_completo.py <archivo.pdf>", file=sys.stderr)
        sys.exit(1)
    
    archivo_pdf = sys.argv[1]
    if not os.path.exists(archivo_pdf):
        print(f"Error: El archivo {archivo_pdf} no existe", file=sys.stderr)
        sys.exit(1)
    
    try:
        datos = extraer_datos(archivo_pdf)
        print(json.dumps(datos, indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"Error al procesar el PDF: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)