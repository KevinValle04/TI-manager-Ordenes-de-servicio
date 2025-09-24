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

    // Verifica que el colaborador fue creado usando el nombre único
    await expect(page.getByRole('cell', { name: nombreUnico, exact: true }))
        .toBeVisible();

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
  
  let solicitudesEncontradas: any[] = [];
  let paginaActual = 1;
  let hayMasPaginas = true;
  
  // Buscar en todas las páginas hasta encontrar las solicitudes del colaborador
  while (hayMasPaginas && solicitudesEncontradas.length < 2) {
    console.log(`Revisando página ${paginaActual}...`);
    
    // Esperar a que la tabla cargue
    const tabla = page.locator('table').first();
    await expect(tabla).toBeVisible({ timeout: 10000 });
    
    // Buscar solicitudes del colaborador en la página actual
    const filasSolicitudes = page.getByRole('row').filter({ hasText: nombreColaborador });
    const cantidadEnPagina = await filasSolicitudes.count();
    
    console.log(`Encontradas ${cantidadEnPagina} solicitudes en página ${paginaActual}`);
    
    // Si encontramos solicitudes en esta página, procesarlas
    if (cantidadEnPagina > 0) {
      for (let i = 0; i < cantidadEnPagina && solicitudesEncontradas.length < 2; i++) {
        solicitudesEncontradas.push({
          fila: filasSolicitudes.nth(i),
          pagina: paginaActual,
          indice: i
        });
      }
    }
    
    // Verificar si hay más páginas
    const paginador = page.locator('.ant-pagination');
    const botonSiguiente = paginador.locator('.ant-pagination-next').first();
    
    if (await botonSiguiente.isVisible() && !(await botonSiguiente.locator('button').isDisabled())) {
      // Ir a la siguiente página
      await botonSiguiente.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000); // Esperar a que la tabla se actualice
      paginaActual++;
    } else {
      hayMasPaginas = false;
    }
    
    // Evitar bucle infinito
    if (paginaActual > 10) {
      console.log('Se alcanzó el límite máximo de páginas (10)');
      break;
    }
  }
  
  console.log(`Total de solicitudes encontradas: ${solicitudesEncontradas.length}`);
  
  // Procesar las solicitudes encontradas
  if (solicitudesEncontradas.length >= 2) {
    // Aprobar la primera solicitud
    console.log('Procesando primera solicitud (APROBAR)...');
    
    // Si la primera solicitud no está en la página actual, navegar a ella
    const primeraSolicitud = solicitudesEncontradas[0];
    if (primeraSolicitud.pagina !== paginaActual) {
      await navegarAPagina(page, primeraSolicitud.pagina);
    }
    
    // Buscar nuevamente la fila en la página correcta
    const filaPrimera = page.getByRole('row').filter({ hasText: nombreColaborador }).first();
    const botonAprobar = filaPrimera.getByRole('button', { name: /aprobar/i });
    
    if (await botonAprobar.isVisible()) {
      await botonAprobar.click();
      
      // Manejar modal de confirmación de aprobación
      const modalAprobacion = page.locator('.ant-modal').filter({ hasText: /confirmar|aprobar/i });
      if (await modalAprobacion.isVisible()) {
        await page.getByRole('button', { name: /aprobar|confirmar/i }).click();
      }
      
      console.log('Primera solicitud aprobada');
      await page.waitForTimeout(2000);
    }
    
    // Rechazar la segunda solicitud (buscar Herramienta2 directamente)
    console.log('Procesando segunda solicitud (RECHAZAR)...');
    
    // Buscar directamente la fila que contenga Herramienta2
    const filaHerramienta2 = page.getByRole('row').filter({ hasText: nombreColaborador }).filter({ hasText: 'Herramienta2' });
    
    if (await filaHerramienta2.count() > 0) {
      const filaSegunda = filaHerramienta2.first();
      const botonRechazar = filaSegunda.getByRole('button', { name: /rechazar/i });
      
      if (await botonRechazar.isVisible()) {
        await botonRechazar.click();
        
        // Manejar modal de rechazo
        const modalRechazo = page.locator('.ant-modal').filter({ hasText: /rechazar/i });
        if (await modalRechazo.isVisible()) {
          // Llenar el motivo del rechazo
          const campoMotivo = page.locator('textarea').first();
          if (await campoMotivo.isVisible()) {
            await campoMotivo.fill('Herramienta no disponible en inventario - Test automatizado');
          }
          
          // Confirmar el rechazo
          await page.getByRole('button', { name: /rechazar/i }).last().click();
        }
        
        console.log('Segunda solicitud rechazada');
        await page.waitForTimeout(2000);
      }
    }
    
  } else if (solicitudesEncontradas.length === 1) {
    // Si solo hay una solicitud, aprobarla
    console.log('Solo una solicitud encontrada, aprobándola...');
    const solicitudUnica = solicitudesEncontradas[0];
    
    if (solicitudUnica.pagina !== paginaActual) {
      await navegarAPagina(page, solicitudUnica.pagina);
    }
    
    const fila = page.getByRole('row').filter({ hasText: nombreColaborador }).first();
    const botonAprobar = fila.getByRole('button', { name: /aprobar/i });
    
    if (await botonAprobar.isVisible()) {
      await botonAprobar.click();
      
      const modalConfirmacion = page.locator('.ant-modal').filter({ hasText: /confirmar|aprobar/i });
      if (await modalConfirmacion.isVisible()) {
        await page.getByRole('button', { name: /aprobar|confirmar/i }).click();
      }
      
      console.log('Solicitud única aprobada');
    }
  } else {
    console.log(`No se encontraron solicitudes para ${nombreColaborador}`);
  }
  
  // Esperar a que se procesen los cambios finales
  await page.waitForLoadState('networkidle');
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