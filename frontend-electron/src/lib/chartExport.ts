import jsPDF from 'jspdf';

function getSvgFromContainer(container: HTMLElement): SVGSVGElement | null {
  return container.querySelector('svg.recharts-surface');
}

function prepareSvgForExport(originalSvg: SVGSVGElement, container: HTMLElement): SVGSVGElement {
  const svg = originalSvg.cloneNode(true) as SVGSVGElement;
  
  const width = originalSvg.width.baseVal.value || 800;
  const height = originalSvg.height.baseVal.value || 400;
  
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('width', '100%');
  bg.setAttribute('height', '100%');
  bg.setAttribute('fill', '#18181b');
  svg.insertBefore(bg, svg.firstChild);
  
  const elements = svg.querySelectorAll('*');
  elements.forEach((el) => {
    const computed = window.getComputedStyle(el as Element);
    if (el instanceof SVGElement) {
      if (computed.fill && computed.fill !== 'none') {
        el.style.fill = computed.fill;
      }
      if (computed.stroke && computed.stroke !== 'none') {
        el.style.stroke = computed.stroke;
      }
    }
  });
  
  return svg;
}

function svgToDataUrl(svg: SVGSVGElement): string {
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svg);
  const encoded = encodeURIComponent(svgString);
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}

async function svgToPngDataUrl(svg: SVGSVGElement, scale = 2): Promise<string> {
  return new Promise((resolve, reject) => {
    const width = svg.width.baseVal.value || 800;
    const height = svg.height.baseVal.value || 400;
    
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }
    
    ctx.scale(scale, scale);
    
    const img = new window.Image();
    img.onload = () => {
      ctx.fillStyle = '#18181b';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = svgToDataUrl(svg);
  });
}

function downloadFile(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function exportChartAsSvg(container: HTMLElement, filename: string): Promise<void> {
  const originalSvg = getSvgFromContainer(container);
  if (!originalSvg) {
    console.error('No SVG found in container');
    return;
  }
  
  const svg = prepareSvgForExport(originalSvg, container);
  const dataUrl = svgToDataUrl(svg);
  downloadFile(dataUrl, `${filename}.svg`);
}

export async function exportChartAsPng(container: HTMLElement, filename: string): Promise<void> {
  const originalSvg = getSvgFromContainer(container);
  if (!originalSvg) {
    console.error('No SVG found in container');
    return;
  }
  
  const svg = prepareSvgForExport(originalSvg, container);
  const dataUrl = await svgToPngDataUrl(svg, 2);
  downloadFile(dataUrl, `${filename}.png`);
}

export async function exportChartAsPdf(container: HTMLElement, filename: string): Promise<void> {
  const originalSvg = getSvgFromContainer(container);
  if (!originalSvg) {
    console.error('No SVG found in container');
    return;
  }
  
  const svg = prepareSvgForExport(originalSvg, container);
  const pngDataUrl = await svgToPngDataUrl(svg, 2);
  
  const width = svg.width.baseVal.value || 800;
  const height = svg.height.baseVal.value || 400;
  
  const pdf = new jsPDF({
    orientation: width > height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [width, height],
  });
  
  pdf.addImage(pngDataUrl, 'PNG', 0, 0, width, height);
  pdf.save(`${filename}.pdf`);
}