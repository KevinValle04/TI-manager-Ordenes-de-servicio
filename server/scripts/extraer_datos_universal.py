#!/usr/bin/env python3
"""
Script Universal para Extracción de Datos de Cotizaciones/Órdenes de Compra
Detecta automáticamente el proveedor y extrae la información correspondiente.

Proveedores soportados:
- Syscom
- Portentum
- Portentum Aruba
- Grupo Dice
- TVC

Uso: python extraer_datos_universal.py <archivo_pdf>
"""

import pdfplumber
import PyPDF2
import re
import json
import sys
import os

def detectar_proveedor(texto):
    """
    Detecta automáticamente el proveedor basándose en el contenido del PDF
    """
    texto_lower = texto.lower()
    
    # Patrones únicos por proveedor
    if 'syscom' in texto_lower or 'SYSCOM' in texto:
        return 'syscom'
    elif ('portentum' in texto_lower or 'PORTENTUM' in texto or 
          'portenntum' in texto_lower or 'PORTENNTUM' in texto or
          'monterrey, n.l.' in texto_lower or
          'av. revolución' in texto_lower):
        if 'aruba' in texto_lower:
            return 'portentum_aruba'
        return 'portentum'
    elif 'grupo dice' in texto_lower or 'GRUPO DICE' in texto:
        return 'grupo_dice'
    elif 'tvc' in texto_lower or 'TVC' in texto or 'vendedor asignado' in texto_lower:
        return 'tvc'
    else:
        return 'desconocido'

def extraer_texto_pdf(archivo_pdf):
    """
    Extrae texto del PDF usando múltiples métodos
    """
    texto_completo = ""
    
    # Método 1: pdfplumber (mejor para tablas)
    try:
        with pdfplumber.open(archivo_pdf) as pdf:
            for page in pdf.pages:
                texto_pagina = page.extract_text()
                if texto_pagina:
                    texto_completo += texto_pagina + "\n"
    except Exception as e:
        print(f"Error con pdfplumber: {e}", file=sys.stderr)
    
    # Método 2: PyPDF2 (respaldo)
    if not texto_completo.strip():
        try:
            with open(archivo_pdf, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page in pdf_reader.pages:
                    texto_completo += page.extract_text() + "\n"
        except Exception as e:
            print(f"Error con PyPDF2: {e}", file=sys.stderr)
    
    return texto_completo

# =================== SYSCOM ===================
def extraer_datos_syscom(texto):
    """Extractor específico para Syscom"""
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

    # Extraer productos
    productos = []
    lineas = texto.split('\n')
    patron_producto = re.compile(r'^(\d+)\s+(PIEZA|SERVICIO|KIT|BOBINA)\s+([A-Z0-9/\-\.\(\)]+)\s+(.+)', re.IGNORECASE)
    
    for i, linea in enumerate(lineas):
        match = patron_producto.match(linea.strip())
        if match:
            cantidad = int(match.group(1))
            unidad = match.group(2)
            codigo = match.group(3)
            resto = match.group(4)
            
            # Extraer descripción y precios
            descripcion = resto
            alm = ""
            precio_lista = None
            precio_unitario = None
            importe = None
            
            # Buscar precios en líneas siguientes
            for j in range(i + 1, min(i + 5, len(lineas))):
                linea_sig = lineas[j].strip()
                patron_precios = re.search(
                    r'([A-Z]{2,4})\s+([\d,]+\.\d{2}|--)\s+([^$]+?)\s+([\d,]+\.\d{2}|--)\s+([\d,]+\.\d{2})$',
                    linea_sig
                )
                if patron_precios:
                    alm = patron_precios.group(1)
                    precio_lista = try_float(patron_precios.group(2))
                    precio_unitario = try_float(patron_precios.group(4))
                    importe = try_float(patron_precios.group(5))
                    break
            
            productos.append({
                "cantidad": cantidad,
                "unidad": unidad,
                "codigo": codigo,
                "descripcion": limpiar_descripcion(descripcion),
                "alm": alm,
                "precioLista": precio_lista,
                "precioUnitario": precio_unitario,
                "importe": importe
            })

    # Extraer datos fiscales
    datos_fiscales = ""
    match_datos = re.search(r"DATOS FISCALES\s*([^\n]+?)\s*RFC:", texto, re.MULTILINE | re.DOTALL)
    if match_datos:
        datos_fiscales = match_datos.group(1).strip()

    return {
        "proveedor": "Syscom",
        "folio": buscar(r"FOLIO:\s*([^\n]+)"),
        "fecha": buscar(r"FECHA:\s*([^\n]+)"),
        "datosFiscales": datos_fiscales,
        "rfc": buscar(r"RFC:\s*([A-Z0-9]{10,13})"),
        "ejecutivo": buscar(r"EJECUTIVO VENTAS:\s*([^\n]+?)(?:\s+EMAIL|\s+OBSERVACIONES|$)"),
        "email": buscar(r"EMAIL:\s*([^\s]+)"),
        "fechaVencimiento": buscar(r"FECHA DE VENCIMIENTO:\s*([^\n]+?)(?:\s*\*|$)"),
        "formaPago": buscar(r"FORMA DE PAGO:\s*([^\n]+)"),
        "productos": productos,
        "totales": {
            "subTotal": buscar_numero(r"SUB-TOTAL\s*\$?\s*([\d,]+\.?\d*)"),
            "iva": buscar_numero(r"I\.V\.A\.\s*\$?\s*([\d,]+\.?\d*)"),
            "total": buscar_numero(r"(?<!SUB-)TOTAL\s*\$?\s*([\d,]+\.?\d*)")
        }
    }

# =================== PORTENTUM ===================
def extraer_datos_portentum(texto):
    """Extractor específico para Portentum"""
    lineas = texto.split('\n')
    
    # Datos generales
    folio = ""
    fecha = ""
    ejecutivo = ""
    productos = []
    
    # Buscar folio
    match_folio = re.search(r'22040.*?(\d+)', texto, re.DOTALL)
    if match_folio:
        folio = match_folio.group(1).strip()
    
    # Buscar otros datos
    for i, linea in enumerate(lineas):
        if re.match(r"^Fecha:", linea.strip()):
            if i+1 < len(lineas):
                fecha = lineas[i+1].strip()
        if "Atentamente:" in linea:
            if i+1 < len(lineas):
                ejecutivo = lineas[i+1].strip()
    
    # Extraer productos
    in_productos = False
    for i, linea in enumerate(lineas):
        if re.match(r"^Linea Parte", linea):
            in_productos = True
            continue
        
        if in_productos:
            if "SubTotal:" in linea or "I.V.A.:" in linea:
                break
            
            match = re.match(
                r"^(\d+)\s+([A-Z0-9\-]+)\s+(.+?)\s+(\d+\.\d{4})\s+([A-Z]+)\s+([\d,]+\.\d+)\s+([\d\.]+)\s+([\d,]+\.\d+)\s+([\d,]+\.\d+)$",
                linea
            )
            if match:
                productos.append({
                    "cantidad": float(match.group(4)),
                    "unidad": match.group(5),
                    "codigo": match.group(2),
                    "descripcion": match.group(3),
                    "precioLista": try_float(match.group(6)),
                    "descuento": match.group(7),
                    "precioUnitario": try_float(match.group(8)),
                    "importe": try_float(match.group(9))
                })
    
    # Extraer totales
    sub_total = 0.0
    iva = 0.0
    total = 0.0
    
    for linea in lineas:
        if "SubTotal:" in linea:
            sub_total = try_float(linea.split("SubTotal:")[-1])
        if "I.V.A.:" in linea:
            iva = try_float(linea.split("I.V.A.:")[-1])
        if "Total:" in linea:
            total = try_float(linea.split("Total:")[-1])
    
    return {
        "proveedor": "Portentum",
        "folio": folio,
        "fecha": fecha,
        "ejecutivo": ejecutivo,
        "productos": productos,
        "totales": {
            "subTotal": sub_total,
            "iva": iva,
            "total": total
        }
    }

# =================== PORTENTUM ARUBA ===================
def extraer_datos_portentum_aruba(texto):
    """Extractor específico para Portentum Aruba"""
    lineas = texto.split('\n')
    
    folio = ""
    fecha = ""
    ejecutivo = ""
    total = 0.0
    productos = []
    
    # Buscar datos generales
    for line in lineas:
        if not folio:
            m = re.search(r'Folio:\s*([^\s]+)', line)
            if m:
                folio = m.group(1)
        
        if not fecha:
            m = re.search(r'Fecha:\s*(\d{2})-(\w{3})-(\d{2})', line)
            if m:
                dia, mes_texto, anio = m.groups()
                meses = {'ene':'01','feb':'02','mar':'03','abr':'04','may':'05','jun':'06',
                        'jul':'07','ago':'08','sep':'09','oct':'10','nov':'11','dic':'12'}
                mes = meses.get(mes_texto.lower(), '01')
                fecha = f"20{anio}-{mes}-{dia}"
        
        if not ejecutivo:
            m = re.search(r'Elaborado por:\s*([^\n\r]+)', line)
            if m:
                ejecutivo = m.group(1).strip()
        
        if 'P.Venta Canal' in line:
            m = re.search(r'P\.Venta Canal\s*\$\s*([\d\s,]+\.\d{2})', line)
            if m:
                total = limpiar_numero(m.group(1))
    
    # Extraer productos (simplificado)
    productos_raw = []
    buffer = ""
    in_tabla = False
    
    for line in lineas:
        if 'Concepto Cantidad No. De Parte Nombre de Producto' in line:
            in_tabla = True
            continue
        if 'Total P. Lista' in line:
            in_tabla = False
        
        if in_tabla and line.strip().startswith('*'):
            if buffer:
                productos_raw.append(buffer.strip())
            buffer = line
        elif in_tabla and buffer:
            buffer += " " + line
    
    if buffer:
        productos_raw.append(buffer.strip())
    
    # Procesar productos
    regex = re.compile(
        r'^\*(.+?)\s+(\d+)\s+([A-Z0-9\-]+)\s+(.+?)\s+\$\s*([\d\s,]+\.\d{2})\s+.*\$\s*([\d\s,]+\.\d{2})\s+.*\$\s*([\d\s,]+\.\d{2})'
    )
    
    for prod in productos_raw:
        match = regex.match(prod)
        if match:
            productos.append({
                "cantidad": float(match.group(2)),
                "codigo": match.group(3),
                "descripcion": match.group(4).strip(),
                "precioLista": limpiar_numero(match.group(5)),
                "precioUnitario": limpiar_numero(match.group(6)),
                "importe": limpiar_numero(match.group(7))
            })
    
    return {
        "proveedor": "Portentum Aruba",
        "folio": folio,
        "fecha": fecha,
        "ejecutivo": ejecutivo,
        "productos": productos,
        "totales": {
            "total": total
        }
    }

# =================== GRUPO DICE ===================
def extraer_datos_grupo_dice(texto):
    """Extractor específico para Grupo Dice"""
    
    # Extraer folio
    folio_match = re.search(r'QUOTE:\s*([^\n\r]*?)\s*FECHA', texto, re.DOTALL)
    folio = ""
    if folio_match:
        folio_texto = folio_match.group(1).strip()
        if folio_texto and not re.match(r'^\s*$', folio_texto):
            folio = folio_texto
    
    # Extraer fecha
    fecha_match = re.search(r'FECHA\s+(\d{2}/\d{2}/\d{4})', texto)
    fecha = ""
    if fecha_match:
        fecha_original = fecha_match.group(1)
        dia, mes, año = fecha_original.split('/')
        fecha = f"{año}-{mes}-{dia}"
    
    # Extraer ejecutivo
    ejecutivo_match = re.search(r'Vendedor\s+([^\n\r]+)', texto)
    ejecutivo = ejecutivo_match.group(1).strip() if ejecutivo_match else ""
    
    # Extraer productos
    productos = []
    patron_producto = r'(\d+)\s+(\d+)\s+([A-Z0-9\-]+)\s+([^$]+?)\s+\$\s*([0-9,]+\.\d{2})\s+\$\s*([0-9,]+\.\d{2})\s+(\d+\.\d{2})%\s+\$\s*([0-9,]+\.\d{2})\s+([^\n]+)'
    
    matches = re.findall(patron_producto, texto, re.MULTILINE)
    
    for match in matches:
        productos.append({
            "partida": int(match[0]),
            "cantidad": int(match[1]),
            "codigo": match[2].strip(),
            "descripcion": re.sub(r'\s+', ' ', match[3].strip()),
            "precioLista": float(match[4].replace(',', '')),
            "precioUnitario": float(match[5].replace(',', '')),
            "descuento": f"{match[6]}%",
            "precioExtendido": float(match[7].replace(',', '')),
            "stock": match[8].strip()
        })
    
    # Extraer totales
    subtotal_match = re.search(r'SUBTOTAL\s+\$([0-9,]+\.\d{2})', texto)
    iva_match = re.search(r'I\.V\.A\.\s+\d+%\s+\$([0-9,]+\.\d{2})', texto)
    total_match = re.search(r'TOTAL\s+\$([0-9,]+\.\d{2})', texto)
    
    subtotal = float(subtotal_match.group(1).replace(',', '')) if subtotal_match else 0.0
    iva = float(iva_match.group(1).replace(',', '')) if iva_match else 0.0
    total = float(total_match.group(1).replace(',', '')) if total_match else 0.0
    
    return {
        "proveedor": "Grupo Dice",
        "folio": folio,
        "fecha": fecha,
        "ejecutivo": ejecutivo,
        "productos": productos,
        "totales": {
            "subTotal": subtotal,
            "iva": iva,
            "total": total
        }
    }

# =================== TVC ===================
def extraer_datos_tvc(texto):
    """Extractor específico para TVC"""
    
    # Extraer datos básicos
    folio_match = re.search(r'Folio\s+(\d+)', texto)
    folio = folio_match.group(1) if folio_match else ""
    
    fecha_match = re.search(r'(\d{4}-\d{2}-\d{2})', texto)
    fecha = fecha_match.group(1) if fecha_match else ""
    
    ejecutivo_match = re.search(r'Vendedor asignado:\s*\d+\s*-\s*([^/]+)', texto)
    ejecutivo = ejecutivo_match.group(1).strip() if ejecutivo_match else ""
    
    # Extraer productos
    productos = []
    detalle_match = re.search(r'Detalle del pedido(.*?)(?=Los precios mostrados|©|$)', texto, re.DOTALL)
    
    if detalle_match:
        detalle_texto = detalle_match.group(1)
        claves_productos = re.findall(r'\b([A-Z]{2,}\d{6,})\b', detalle_texto)
        
        for clave in claves_productos:
            patron_producto = rf'{re.escape(clave)}\s+([^\n]+(?:\n[^\n]+)*?)\s+(\d+)\s+\$([0-9,]+\.\d{{2}})\s+(-?\d+\.\d{{2}}%)\s+\$([0-9,]+\.\d{{2}})\s+\$([0-9,]+\.\d{{2}})'
            match = re.search(patron_producto, detalle_texto, re.MULTILINE | re.DOTALL)
            
            if match:
                productos.append({
                    "codigo": clave,
                    "descripcion": re.sub(r'\s+', ' ', match.group(1).strip()),
                    "cantidad": float(match.group(2)),
                    "precioUnitario": float(match.group(5).replace(',', '')),
                    "importe": float(match.group(6).replace(',', ''))
                })
    
    # Extraer totales
    subtotal_match = re.search(r'Subtotal\s+MXN\s+\$([0-9,]+\.\d{2})', texto)
    iva_match = re.search(r'IVA\s+MXN\s+\$([0-9,]+\.\d{2})', texto)
    total_match = re.search(r'Total\s+MXN\s+\$([0-9,]+\.\d{2})', texto)
    
    subtotal = float(subtotal_match.group(1).replace(',', '')) if subtotal_match else 0.0
    iva = float(iva_match.group(1).replace(',', '')) if iva_match else 0.0
    total = float(total_match.group(1).replace(',', '')) if total_match else 0.0
    
    return {
        "proveedor": "TVC",
        "folio": folio,
        "fecha": fecha,
        "ejecutivo": ejecutivo,
        "productos": productos,
        "totales": {
            "subTotal": subtotal,
            "iva": iva,
            "total": total
        }
    }

# =================== FUNCIONES AUXILIARES ===================
def try_float(valor):
    """Convierte un valor a float de forma segura"""
    if not valor or valor == "--" or valor == "None":
        return None
    try:
        valor_limpio = str(valor).replace(",", "").replace("$", "").strip()
        if valor_limpio and valor_limpio != "--":
            return float(valor_limpio)
    except:
        pass
    return None

def limpiar_numero(texto):
    """Limpia y convierte texto a número"""
    return float(re.sub(r'[^\d.]', '', texto.replace(' ', '').replace(',', '')))

def limpiar_descripcion(descripcion):
    """Limpia la descripción de elementos no deseados"""
    if not descripcion:
        return ""
    
    descripcion = re.sub(r'Clave Producto:.*$', '', descripcion)
    descripcion = re.sub(r'"Tiempo de entrega[^"]*"', '', descripcion)
    descripcion = re.sub(r'\s+', ' ', descripcion)
    return descripcion.strip()

# =================== FUNCIÓN PRINCIPAL ===================
def procesar_pdf_universal(archivo_pdf):
    """
    Función principal que detecta el proveedor y extrae los datos
    """
    try:
        # Extraer texto del PDF
        print(f"Extrayendo texto de: {archivo_pdf}", file=sys.stderr)
        texto = extraer_texto_pdf(archivo_pdf)
        
        if not texto.strip():
            return {"error": "No se pudo extraer texto del PDF"}
        
        # Detectar proveedor
        proveedor = detectar_proveedor(texto)
        print(f"Proveedor detectado: {proveedor}", file=sys.stderr)
        
        # Extraer datos según el proveedor
        if proveedor == 'syscom':
            return extraer_datos_syscom(texto)
        elif proveedor == 'portentum':
            return extraer_datos_portentum(texto)
        elif proveedor == 'portentum_aruba':
            return extraer_datos_portentum_aruba(texto)
        elif proveedor == 'grupo_dice':
            return extraer_datos_grupo_dice(texto)
        elif proveedor == 'tvc':
            return extraer_datos_tvc(texto)
        else:
            return {
                "error": f"Proveedor no reconocido: {proveedor}",
                "texto_muestra": texto[:500] + "..." if len(texto) > 500 else texto
            }
    
    except Exception as e:
        return {"error": f"Error procesando PDF: {str(e)}"}

# =================== ENTRADA PRINCIPAL ===================
if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("❌ ERROR: Se requiere la ruta del archivo PDF como argumento", file=sys.stderr)
        print("Uso: python extraer_datos_universal.py <archivo_pdf>", file=sys.stderr)
        sys.exit(1)
    
    archivo_pdf = sys.argv[1]
    
    if not os.path.exists(archivo_pdf):
        print(f"❌ Error: El archivo {archivo_pdf} no existe", file=sys.stderr)
        sys.exit(1)
    
    try:
        resultado = procesar_pdf_universal(archivo_pdf)
        print(json.dumps(resultado, indent=2, ensure_ascii=False))
        
        # Imprimir resumen en stderr
        if "productos" in resultado:
            print(f"\n✅ EXTRACCIÓN EXITOSA:", file=sys.stderr)
            print(f"   Proveedor: {resultado.get('proveedor', 'N/A')}", file=sys.stderr)
            print(f"   Folio: {resultado.get('folio', 'N/A')}", file=sys.stderr)
            print(f"   Productos: {len(resultado['productos'])}", file=sys.stderr)
            print(f"   Total: ${resultado.get('totales', {}).get('total', 'N/A')}", file=sys.stderr)
        elif "error" in resultado:
            print(f"\n❌ ERROR: {resultado['error']}", file=sys.stderr)
    
    except Exception as e:
        print(f"❌ ERROR CRÍTICO: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)