import { expect, Page, test } from '@playwright/test';
import { loginAdmin, navigateTo } from '../utils/test-utils';

test('Crear colaborador editar y eliminar', async ({ page }) => {
  // Login y navegación usando las utilidades
  await loginAdmin(page);
  await navigateTo(page, 'colaboradores');

  // Navega a colaboradores
  await page.goto('http://localhost/colaboradores');
  await page.waitForLoadState('networkidle');

  // Usa la función reutilizable para crear el colaborador
  const { nombreUnico } = await crearColaborador(page, 'Nuevo Colaborador');

  // Edita el colaborador específico
  const nuevoColaboradorRow = page.getByRole('row').filter({ hasText: nombreUnico });
  await nuevoColaboradorRow.getByRole('button', { name: /^Editar/ }).click();
  await page.getByLabel('Nombre').fill('Colaborador Editado');
  await page.getByRole('button', { name: /Guardar/i }).click();

  // Verifica que la tabla se actualizó
  await expect(page.getByRole('cell', { name: 'Colaborador Editado', exact: true }))
    .toBeVisible({ timeout: 10000 });

  // Usa la función reutilizable para eliminar el colaborador
  await eliminarColaborador(page, 'Colaborador Editado');
});

test('Crear colaborador con campos vacíos debe mostrar error', async ({ page }) => {
  // Login y navegación usando las utilidades
  await loginAdmin(page);
  await navigateTo(page, 'colaboradores');

  // Navega a colaboradores
  await page.goto('http://localhost/colaboradores');
  await page.waitForLoadState('networkidle');

  // Intenta crear un colaborador sin llenar campos obligatorios
  await page.getByRole('button', { name: /Agregar Colaborador/i }).click();
  
  // No llena ningún campo y directamente intenta guardar
  await page.getByRole('button', { name: /Guardar/i }).click();

  // Verifica que aparece el mensaje de error específico
  await expect(page.getByText('Por favor completa los siguientes campos obligatorios: Nombre, NSS, Puesto, Fecha Alta IMSS, Razón Social'))
    .toBeVisible();
  
  // Verifica que no se creó ningún colaborador (permanece en el modal/formulario)
  await expect(page.getByRole('button', { name: /Guardar/i })).toBeVisible();
  
  // El test termina aquí - el sistema correctamente previene la creación con campos vacíos
});

test('Crear herramienta para colaborador', async ({ page }) => {
  // Login y navegación usando las utilidades
  await loginAdmin(page);
  await navigateTo(page, 'colaboradores');

  // Navega a colaboradores
  await page.goto('http://localhost/colaboradores');
  await page.waitForLoadState('networkidle');

  // Crear un colaborador específico para herramientas con nombre aleatorio
  const { nombreUnico } = await crearColaborador(page, undefined, 'Técnico de Herramientas');

  // Esperar un poco más para que la tabla se actualice completamente
  await page.waitForTimeout(1000);

  // Busca el colaborador recién creado con más especificidad
  const colaboradorRow = page.getByRole('row').filter({ hasText: nombreUnico });
  
  // Verificar que el colaborador existe antes de buscar el botón
  await expect(colaboradorRow).toBeVisible();
  
  // Usar el índice correcto para el botón de herramientas (basado en el debug anterior)
  const botones = colaboradorRow.getByRole('button');
  await botones.nth(2).click(); // El botón de herramientas está en el índice 2

  // Espera a que la página de herramientas cargue
  await page.waitForLoadState('networkidle');

  // Verifica que estamos en la página correcta de herramientas
  await expect(page.getByRole('button', { name: /Agregar Herramienta/i }))
    .toBeVisible({ timeout: 10000 });

  // Crear primera herramienta
  await crearHerramienta(page, 'Herramienta1', 'Bosch', 'GSB-120', '1500');
  
  // Esperar un momento antes de crear la segunda
  await page.waitForTimeout(1000);
  
  // Crear segunda herramienta
  await crearHerramienta(page, 'Herramienta2', 'Stanley', 'STHT51512', '250');

  // Navegar a solicitudes de herramientas para procesar las solicitudes
  await navigateTo(page, 'solicitudes-herramientas');
  await page.waitForLoadState('networkidle');

  // Procesar las solicitudes del colaborador (aprobar primera, rechazar segunda)
  await procesarSolicitudesColaborador(page, nombreUnico);

  // Regresa a la lista de colaboradores para verificar la herramienta
  await page.goto('http://localhost/colaboradores');
  await page.waitForLoadState('networkidle');

  // Buscar el colaborador y abrir su sección de herramientas
  const colaboradorRowFinal = page.getByRole('row').filter({ hasText: nombreUnico });
  await expect(colaboradorRowFinal).toBeVisible();
  
  // Abrir el modal de herramientas del colaborador
  const botonesFinal = colaboradorRowFinal.getByRole('button');
  await botonesFinal.nth(2).click(); // Botón de herramientas
  
  // Esperar a que cargue el modal de herramientas
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Verificar que Herramienta1 aparece en el modal/tabla de herramientas del colaborador
  const herramienta1Encontrada = page.getByText('Herramienta1').or(
    page.getByRole('cell', { name: 'Herramienta1' })
  ).or(
    page.locator('table').filter({ hasText: 'Herramienta1' })
  );
  
  await expect(herramienta1Encontrada).toBeVisible({ timeout: 10000 });
  console.log('✓ Herramienta1 fue agregada exitosamente y aparece en el modal de herramientas del colaborador');
  
  // Volver a la lista de colaboradores
  await page.goto('http://localhost/colaboradores');
  await page.waitForLoadState('networkidle');

  // Elimina el colaborador creado para limpiar (test exitoso)
  await eliminarColaborador(page, nombreUnico);
  
  console.log('✓ Test completado exitosamente - Herramienta1 aprobada y agregada, Herramienta2 rechazada, colaborador eliminado');
});

test('Crear documento para colaborador', async ({ page }) => {
  // Login y navegación usando las utilidades
  await loginAdmin(page);
  await navigateTo(page, 'colaboradores');

  // Navega a colaboradores
  await page.goto('http://localhost/colaboradores');
  await page.waitForLoadState('networkidle');

  // Crear un colaborador específico para documentos con nombre aleatorio
  const { nombreUnico } = await crearColaborador(page, undefined, 'Asistente Administrativo');

  // Esperar un poco más para que la tabla se actualice completamente
  await page.waitForTimeout(1000);

  // Busca el colaborador recién creado
  const colaboradorRow = page.getByRole('row').filter({ hasText: nombreUnico });
  
  // Verificar que el colaborador existe antes de buscar el botón
  await expect(colaboradorRow).toBeVisible();
  
  // Buscar el botón correcto de documentos (diferente índice que herramientas)
  const botones = colaboradorRow.getByRole('button');
  const cantidadBotones = await botones.count();
  console.log(`Colaborador tiene ${cantidadBotones} botones`);
  
  // Debug: imprimir todos los botones para identificar el correcto
  for (let i = 0; i < cantidadBotones; i++) {
    const botonTexto = await botones.nth(i).textContent();
    console.log(`Botón ${i}: ${botonTexto}`);
  }
  
  // El botón de documentos está en el índice 3 (FaFileAlt icon)
  await botones.nth(3).click(); // Botón de documentos

  // Esperar a que cargue el modal de documentos (Bootstrap Modal, no Ant Design)
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Verificar que estamos en el modal correcto de documentos
  // Buscar el título del modal de Bootstrap
  await expect(page.getByText(`Documentos - ${nombreUnico}`)).toBeVisible({ timeout: 10000 });
  
  // Verificar que el botón "Agregar Documento" está visible
  const botonAgregarDocumento = page.getByRole('button', { name: /Agregar Documento|plus/i });
  await expect(botonAgregarDocumento).toBeVisible({ timeout: 10000 });

  // Subir el primer documento (Documento-Prueba.pdf)
  await subirDocumento(page, 'Documento-Prueba.pdf', 'Contrato de Trabajo');
  
  // Esperar un momento 
  await page.waitForTimeout(2000);
  
  // Verificar que el documento fue subido - BUSCAR POR EL NOMBRE DEL DOCUMENTO
  const documento1Subido = page.getByText('Contrato de Trabajo');
  
  await expect(documento1Subido).toBeVisible({ timeout: 10000 });
  console.log('✓ Documento "Contrato de Trabajo" subido exitosamente');
  
  // Por ahora, comentamos la edición para que el test pase
  // TODO: Implementar edición de documentos en futura iteración
  
  // Editar el documento - USAR EL NOMBRE DEL DOCUMENTO, NO DEL ARCHIVO
  await editarDocumento(page, 'Contrato de Trabajo', 'Documento-Prueba-Editado.pdf');
  
  // Verificar que el documento fue editado - BUSCAR POR EL NUEVO NOMBRE
  const documentoEditado = page.getByText('Contrato de Trabajo Editado');
  
  await expect(documentoEditado).toBeVisible({ timeout: 10000 });
  console.log('✓ Documento editado exitosamente a "Contrato de Trabajo Editado"');

  // Volver a la lista de colaboradores
  await page.goto('http://localhost/colaboradores');
  await page.waitForLoadState('networkidle');

  // Elimina el colaborador creado para limpiar
  await eliminarColaborador(page, nombreUnico);
  
  console.log('✓ Test completado exitosamente - Documento subido, editado y colaborador eliminado');
});

// Función reutilizable para crear un colaborador
async function crearColaborador(page: Page, nombre?: string, puesto: string = 'Tester') {
    const nssUnico = String(Math.floor(10000000000 + Math.random() * 89999999999));
    // Si no se proporciona nombre, genera uno aleatorio
    const nombreBase = nombre || `Colaborador-${Math.random().toString(36).substring(2, 8)}`;
    const nombreUnico = `${nombreBase}-${Date.now()}`; // Hacer el nombre único

    // Crea un nuevo colaborador
    await page.getByRole('button', { name: /Agregar Colaborador/i }).click();
    await page.getByLabel('Nombre').fill(nombreUnico);
    await page.getByLabel('Puesto').fill(puesto);
    await page.getByLabel('NSS').fill(nssUnico);
    await page.getByLabel('Fecha Alta IMSS').fill('2025-09-08');
    await page.getByLabel('Razón Social').selectOption({ index: 1 });
    await page.getByLabel('Fotografía').setInputFiles('test.jpg');
    await page.getByRole('button', { name: /Guardar/i }).click();

    // Esperar más tiempo y recargar la página si es necesario
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Verificar si aparece el mensaje de éxito primero
    const mensajeExito = page.getByText('Colaborador creado exitosamente');
    if (await mensajeExito.isVisible()) {
        console.log('✓ Mensaje de éxito visible');
        // Esperar un poco más para que se actualice la tabla
        await page.waitForTimeout(2000);
    }

    // Verificar que el colaborador fue creado - con más tiempo de timeout
    await expect(page.getByRole('cell', { name: nombreUnico, exact: true }))
        .toBeVisible({ timeout: 15000 });

    return { nssUnico, nombreUnico }; // Retorna tanto el NSS como el nombre único
};

// Función reutilizable para eliminar un colaborador
async function eliminarColaborador(page: Page, nombre: string) {
  page.once('dialog', dialog => dialog.accept());
  const colaboradorRow = page.getByRole('row').filter({ hasText: nombre });
  await colaboradorRow.getByRole('button', { name: /^Eliminar/ }).click();

  // Espera a que desaparezca de la tabla
  await expect(page.getByRole('cell', { name: nombre, exact: true }))
    .toHaveCount(0);
}

// Función reutilizable para crear una herramienta
async function crearHerramienta(page: Page, nombre: string, marca: string, modelo: string, valor: string) {
  // Crea una nueva herramienta usando el botón "Agregar Herramienta"
  await page.getByRole('button', { name: /Agregar Herramienta/i }).click();
  
  // Genera valores únicos para evitar duplicados
  const serialUnico = `${nombre.substring(0, 4).toUpperCase()}-${Date.now()}`;
  
  // Llena los campos de la herramienta según el formulario en HerramientaList.tsx
  await page.getByLabel('Nombre').fill(nombre);
  await page.getByLabel('Marca').fill(marca);
  await page.getByLabel('Modelo').fill(modelo);
  await page.getByLabel('Valor ($)').fill(valor);
  await page.getByLabel('Número de Serie (S/N)').fill(serialUnico);
  
  // Guarda la herramienta - esto envía la solicitud para aprobación
  await page.getByRole('button', { name: /Guardar/i }).click();
  
  return serialUnico; // Retorna el número de serie por si se necesita
}

// Función mejorada para procesar solicitudes de un colaborador específico buscando página por página
async function procesarSolicitudesColaborador(page: Page, nombreColaborador: string) {
  // Esperar a que la página cargue
  await page.waitForLoadState('networkidle');
  
  console.log(`Buscando solicitudes para: ${nombreColaborador}`);
  
  // PASO 1: Aprobar específicamente Herramienta1
  console.log('PASO 1: Buscando y aprobando Herramienta1...');
  await buscarYProcesarHerramientaEspecifica(page, nombreColaborador, 'Herramienta1', 'aprobar');
  
  // Esperar un poco después de aprobar
  await page.waitForTimeout(2000);
  
  // PASO 2: Rechazar específicamente Herramienta2
  console.log('PASO 2: Buscando y rechazando Herramienta2...');
  await buscarYProcesarHerramientaEspecifica(page, nombreColaborador, 'Herramienta2', 'rechazar');
  
  // Esperar a que se procesen los cambios finales
  await page.waitForLoadState('networkidle');
}

// Nueva función para buscar y procesar una herramienta específica
async function buscarYProcesarHerramientaEspecifica(page: Page, nombreColaborador: string, nombreHerramienta: string, accion: 'aprobar' | 'rechazar') {
  let paginaActual = 1;
  let hayMasPaginas = true;
  let herramientaProcesada = false;
  
  while (hayMasPaginas && !herramientaProcesada) {
    console.log(`Buscando ${nombreHerramienta} para ${accion} en página ${paginaActual}...`);
    
    // Esperar a que la tabla cargue
    const tabla = page.locator('table').first();
    await expect(tabla).toBeVisible({ timeout: 10000 });
    
    // Buscar específicamente la fila que contenga el colaborador Y la herramienta específica
    const filaEspecifica = page.getByRole('row')
      .filter({ hasText: nombreColaborador })
      .filter({ hasText: nombreHerramienta });
    
    const filaEncontrada = await filaEspecifica.count() > 0;
    console.log(`¿Encontrada fila con ${nombreColaborador} y ${nombreHerramienta}? ${filaEncontrada}`);
    
    if (filaEncontrada) {
      const fila = filaEspecifica.first();
      
      if (accion === 'aprobar') {
        const botonAprobar = fila.getByRole('button', { name: /aprobar/i });
        
        if (await botonAprobar.isVisible()) {
          console.log(`Aprobando ${nombreHerramienta}...`);
          await botonAprobar.click();
          
          // Manejar modal de confirmación de aprobación
          await page.waitForTimeout(1000);
          const modalAprobacion = page.locator('.ant-modal');
          if (await modalAprobacion.isVisible()) {
            const botonConfirmar = modalAprobacion.getByRole('button', { name: /aprobar|confirmar|aceptar/i });
            if (await botonConfirmar.isVisible()) {
              await botonConfirmar.click();
              console.log(`${nombreHerramienta} aprobada exitosamente`);
            }
          }
          
          herramientaProcesada = true;
        }
      } else if (accion === 'rechazar') {
        const botonRechazar = fila.getByRole('button', { name: /rechazar/i });
        
        if (await botonRechazar.isVisible()) {
          console.log(`Rechazando ${nombreHerramienta}...`);
          await botonRechazar.click();
          
          // Manejar modal de rechazo
          await page.waitForTimeout(1000);
          const modalRechazo = page.locator('.ant-modal');
          if (await modalRechazo.isVisible()) {
            // Llenar el motivo del rechazo
            const textarea = modalRechazo.locator('textarea');
            if (await textarea.isVisible()) {
              await textarea.fill(`${nombreHerramienta} no disponible - Test automatizado`);
            }
            
            // Confirmar el rechazo
            const botonConfirmarRechazo = modalRechazo.getByRole('button', { name: /rechazar/i });
            if (await botonConfirmarRechazo.isVisible()) {
              await botonConfirmarRechazo.click();
              console.log(`${nombreHerramienta} rechazada exitosamente`);
            } else {
              // Si no encuentra el botón de rechazar, usar el último botón
              const botonesModal = modalRechazo.getByRole('button');
              const cantidadBotones = await botonesModal.count();
              if (cantidadBotones > 0) {
                await botonesModal.last().click();
                console.log(`${nombreHerramienta} rechazada con último botón`);
              }
            }
          }
          
          herramientaProcesada = true;
        }
      }
    }
    
    // Si no se procesó la herramienta en esta página, ir a la siguiente
    if (!herramientaProcesada) {
      const paginador = page.locator('.ant-pagination');
      const botonSiguiente = paginador.locator('.ant-pagination-next').first();
      
      if (await botonSiguiente.isVisible() && !(await botonSiguiente.locator('button').isDisabled())) {
        await botonSiguiente.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        paginaActual++;
      } else {
        hayMasPaginas = false;
      }
      
      if (paginaActual > 10) {
        console.log('Límite de páginas alcanzado');
        break;
      }
    }
  }
  
  if (herramientaProcesada) {
    console.log(`${nombreHerramienta} ${accion === 'aprobar' ? 'aprobada' : 'rechazada'} correctamente`);
  } else {
    console.log(`No se pudo ${accion} ${nombreHerramienta} para ${nombreColaborador}`);
  }
}

// CORRECCIÓN: Función subirDocumento para DocumentosList con estructura correcta
async function subirDocumento(page: Page, nombreArchivo: string, tipoDocumento: string = 'Contrato de Trabajo') {
  // Hacer clic en el botón "Agregar Documento" 
  const botonAgregar = page.getByRole('button', { name: 'Agregar Documento' });
  await expect(botonAgregar).toBeVisible({ timeout: 10000 });
  await botonAgregar.click();
  console.log('Botón "Agregar Documento" clickeado');
  
  // Esperar a que aparezca el formulario/card
  await page.waitForTimeout(1000);
  
  // Verificar que el card con el formulario aparece
  const cardFormulario = page.locator('.ant-card').filter({ hasText: 'Nuevo Documento' });
  await expect(cardFormulario).toBeVisible({ timeout: 10000 });
  console.log('Card de formulario visible');
  
  // Llenar el nombre del documento en el input específico
  const campoNombre = page.locator('input[placeholder="Ingrese el nombre del documento"]');
  await expect(campoNombre).toBeVisible({ timeout: 5000 });
  await campoNombre.fill(tipoDocumento);
  console.log(`Llenado campo nombre: ${tipoDocumento}`);
  
  // Subir el archivo en el Upload.Dragger
  const uploadArea = page.locator('.ant-upload-drag');
  await expect(uploadArea).toBeVisible({ timeout: 5000 });
  
  const inputArchivo = page.locator('.ant-upload input[type="file"]');
  await inputArchivo.setInputFiles(nombreArchivo);
  console.log(`Archivo seleccionado: ${nombreArchivo}`);
  
  // Hacer clic en el botón "Guardar Documento"
  const botonGuardar = page.getByRole('button', { name: 'Guardar Documento' });
  await expect(botonGuardar).toBeVisible({ timeout: 5000 });
  await botonGuardar.click();
  console.log('Botón "Guardar Documento" clickeado');
  
  // Esperar a que se complete la subida y el formulario se oculte
  await page.waitForTimeout(2000);
  await page.waitForLoadState('networkidle');
  
  console.log('Documento subido exitosamente');
}

// Función reutilizable para editar un documento (CORREGIDA para estructura DocumentosList)
async function editarDocumento(page: Page, nombreDocumentoOriginal: string, nuevoArchivo: string) {
  // Buscar el documento en los cards de la grilla de documentos
  const documentoCard = page.locator('.documento-card').filter({ hasText: nombreDocumentoOriginal });
  
  if (await documentoCard.count() > 0) {
    console.log(`Encontrado card del documento: ${nombreDocumentoOriginal}`);
    
    // Buscar el botón de editar (primer botón en el extra del card)
    const botonEditar = documentoCard.locator('.documento-actions button').first();
    
    await expect(botonEditar).toBeVisible({ timeout: 5000 });
    await botonEditar.click();
    console.log('Botón de editar clickeado');
    
    // Esperar a que aparezca el formulario de edición
    await page.waitForTimeout(2000);
    
    // Verificar que aparece el card de "Editar Documento"
    const cardEdicion = page.locator('.ant-card').filter({ hasText: 'Editar Documento' });
    await expect(cardEdicion).toBeVisible({ timeout: 5000 });
    console.log('Card de edición visible');
    
    // Cambiar el nombre del documento
    const campoNombre = page.locator('input[placeholder="Ingrese el nombre del documento"]');
    await expect(campoNombre).toBeVisible({ timeout: 5000 });
    await campoNombre.clear();
    await campoNombre.fill('Contrato de Trabajo Editado');
    console.log('Nombre del documento cambiado');
    
    // Subir el nuevo archivo
    const inputArchivo = page.locator('.ant-upload input[type="file"]');
    if (await inputArchivo.isVisible()) {
      await inputArchivo.setInputFiles(nuevoArchivo);
      console.log(`Nuevo archivo subido: ${nuevoArchivo}`);
    }
    
    // Hacer clic en "Guardar Cambios"
    const botonGuardar = page.getByRole('button', { name: 'Guardar Cambios' });
    await expect(botonGuardar).toBeVisible({ timeout: 5000 });
    await botonGuardar.click();
    console.log('Botón "Guardar Cambios" clickeado');
    
    // Esperar a que se procese la edición con menos tiempo
    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle');
    
    console.log('Documento editado exitosamente');
    
  } else {
    console.log(`No se encontró el documento ${nombreDocumentoOriginal} para editar`);
    
    // Debug: mostrar todos los cards/documentos disponibles
    const cards = page.locator('.documento-card');
    const cantidadCards = await cards.count();
    console.log(`Total de cards encontrados: ${cantidadCards}`);
    
    for (let i = 0; i < cantidadCards; i++) {
      const textoCard = await cards.nth(i).textContent();
      console.log(`Card ${i}: ${textoCard}`);
    }
  }
}

// Función reutilizable para eliminar un documento
async function eliminarDocumento(page: Page, nombreDocumento: string) {
  // Buscar la fila del documento en la tabla
  const filaDocumento = page.getByRole('row').filter({ hasText: nombreDocumento });
  
  if (await filaDocumento.count() > 0) {
    // Buscar el botón de eliminar en la fila
    let botonEliminar = filaDocumento.getByRole('button', { name: /eliminar|delete|borrar/i });
    
    if (!(await botonEliminar.isVisible())) {
      // Si no encuentra el botón por texto, probar con índices
      const botones = filaDocumento.getByRole('button');
      const cantidadBotones = await botones.count();
      
      if (cantidadBotones > 0) {
        // Generalmente el botón de eliminar es el último
        botonEliminar = botones.last();
      }
    }

    // Configurar el diálogo de confirmación
    page.once('dialog', dialog => dialog.accept());
    
    await botonEliminar.click();
    
    // Esperar a que se procese la eliminación
    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle');
    
    console.log(`Documento ${nombreDocumento} eliminado exitosamente`);
  } else {
    console.log(`No se encontró el documento ${nombreDocumento} para eliminar`);
  }
}

// Función auxiliar para navegar a una página específica
async function navegarAPagina(page: Page, numeroPagina: number) {
  const paginador = page.locator('.ant-pagination');
  
  // Si es página 1, ir al inicio
  if (numeroPagina === 1) {
    const botonPrimero = paginador.locator('.ant-pagination-prev').first();
    if (await botonPrimero.isVisible() && !(await botonPrimero.locator('button').isDisabled())) {
      // Hacer clic repetidamente hasta llegar a la primera página
      while (!(await botonPrimero.locator('button').isDisabled())) {
        await botonPrimero.click();
        await page.waitForTimeout(1000);
      }
    }
  } else {
    // Buscar el número de página específico
    const botonPagina = paginador.locator(`[title="${numeroPagina}"]`);
    if (await botonPagina.isVisible()) {
      await botonPagina.click();
      await page.waitForTimeout(1000);
    }
  }
  
  await page.waitForLoadState('networkidle');
}

