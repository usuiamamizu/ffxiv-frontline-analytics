const Charts = {
  drawDonut(canvas, segments, centerText, options = {}) {
    const ctx = setupCanvas(canvas);
    const { width, height } = canvas.getBoundingClientRect();
    const showLegend = options.legend !== false;
    const legendRight = showLegend && options.legendPosition === "right";
    const legendWidth = legendRight ? Math.min(130, width * 0.38) : 0;
    const legendRows = showLegend && !legendRight ? Math.ceil(segments.length / 2) : 0;
    const legendHeight = showLegend && !legendRight ? Math.min(48, legendRows * 17 + 8) : 0;
    const chartWidth = Math.max(110, width - legendWidth);
    const chartHeight = Math.max(86, height - legendHeight - 8);
    const cx = chartWidth / 2;
    const cy = chartHeight / 2 + 4;
    const radius = Math.min(chartWidth * 0.32, chartHeight * 0.35);
    const ringWidth = Math.max(12, radius * 0.34);
    const total = segments.reduce((sum, item) => sum + item.value, 0) || 1;
    let start = -Math.PI / 2;

    ctx.lineCap = "butt";
    ctx.beginPath();
    ctx.strokeStyle = "rgba(0,0,0,.32)";
    ctx.lineWidth = ringWidth + 4;
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = ringWidth;
    for (const item of segments) {
      const angle = (item.value / total) * Math.PI * 2;
      if (angle <= 0) continue;
      ctx.beginPath();
      ctx.strokeStyle = item.color;
      ctx.arc(cx, cy, radius, start, start + angle);
      ctx.stroke();
      start += angle;
    }

    if (options.icons) {
      drawDonutIcons(ctx, segments, {
        cx,
        cy,
        radius,
        ringWidth,
        total,
        startAngle: -Math.PI / 2
      });
    }

    if (centerText) {
      ctx.fillStyle = "#ffd36b";
      ctx.font = `700 ${Math.max(16, Math.min(22, radius * .32))}px Georgia`;
      ctx.textAlign = "center";
      ctx.fillText(centerText, cx, cy + 8);
    }

    if (showLegend) {
      if (legendRight) this.legendVertical(ctx, segments, chartWidth + 6, cy - segments.length * 11, options);
      else this.legend(ctx, segments, 14, height - legendHeight + 14, width);
    }
  },

  drawLine(canvas, points, options = {}) {
    const ctx = setupCanvas(canvas);
    const { width, height } = canvas.getBoundingClientRect();
    const pad = Math.min(46, Math.max(34, height * .2));
    const max = options.max ?? Math.max(...points, 1);
    const min = options.min ?? Math.min(...points, 0);
    drawGrid(ctx, width, height, pad, min, max, {
      xCount: points.length,
      formatY: options.formatY || defaultNumber,
      yLabels: options.yLabels,
      invert: options.invert
    });
    if (points.length < 2) return;

    ctx.beginPath();
    points.forEach((value, index) => {
      const x = pad + index * ((width - pad * 2) / (points.length - 1));
      const y = pad + ((value - min) / ((max - min) || 1)) * (height - pad * 2);
      const plotY = options.invert ? y : height - y;
      if (index === 0) ctx.moveTo(x, plotY);
      else ctx.lineTo(x, plotY);
    });
    ctx.strokeStyle = "#d8a33a";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "#d8a33a";
    points.forEach((value, index) => {
      const x = pad + index * ((width - pad * 2) / (points.length - 1));
      const y = pad + ((value - min) / ((max - min) || 1)) * (height - pad * 2);
      const plotY = options.invert ? y : height - y;
      ctx.beginPath();
      ctx.arc(x, plotY, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  },

  drawBars(canvas, points) {
    const ctx = setupCanvas(canvas);
    const { width, height } = canvas.getBoundingClientRect();
    const pad = Math.min(50, Math.max(38, height * .22));
    const max = Math.max(...points, 1);
    drawGrid(ctx, width, height, pad, 0, max, { xCount: points.length, formatY: compactNumber });
    const gap = 8;
    const barWidth = (width - pad * 2 - gap * (points.length - 1)) / Math.max(points.length, 1);
    points.forEach((value, index) => {
      const x = pad + index * (barWidth + gap);
      const h = (value / max) * (height - pad * 2);
      ctx.fillStyle = "#b9ad92";
      ctx.fillRect(x, height - pad - h, Math.max(4, barWidth), h);
      ctx.fillStyle = "#f3d99b";
      ctx.font = "11px Georgia";
      ctx.textAlign = "center";
      if (barWidth > 18) ctx.fillText(compactNumber(value), x + barWidth / 2, height - pad - h - 5);
    });
  },

  legend(ctx, segments, x, y, width) {
    const colWidth = Math.max(110, (width - x * 2) / 2);
    ctx.font = "12px Georgia";
    ctx.textAlign = "left";
    segments.forEach((item, index) => {
      const lx = x + (index % 2) * colWidth;
      const ly = y + Math.floor(index / 2) * 17;
      ctx.fillStyle = item.color;
      ctx.fillRect(lx, ly - 10, 10, 10);
      ctx.fillStyle = "#f3d99b";
      const label = `${item.label} ${item.value}`;
      ctx.fillText(label.length > 15 ? `${label.slice(0, 14)}...` : label, lx + 16, ly);
    });
  },

  legendVertical(ctx, segments, x, y) {
    ctx.font = "13px Georgia";
    ctx.textAlign = "left";
    segments.forEach((item, index) => {
      const ly = y + index * 23;
      ctx.fillStyle = item.color;
      ctx.fillRect(x, ly - 11, 12, 12);
      ctx.fillStyle = "#f3d99b";
      const suffix = item.rate !== undefined ? ` ${Math.round(item.rate * 1000) / 10}%` : ` ${item.value}`;
      ctx.fillText(`${item.label}${suffix}`, x + 18, ly);
    });
  }
};

function drawDonutIcons(ctx, segments, geometry) {
  const { cx, cy, radius, ringWidth, total } = geometry;
  const iconSize = Math.max(22, Math.min(34, ringWidth * 1.12));
  let start = geometry.startAngle;

  segments.forEach(item => {
    const angle = (item.value / total) * Math.PI * 2;
    if (angle <= 0) return;

    const mid = start + angle / 2;
    start += angle;
    if (!item.icon || angle < 0.26) return;

    const x = cx + Math.cos(mid) * radius;
    const y = cy + Math.sin(mid) * radius;
    const image = new Image();
    image.onload = () => {
      ctx.save();
      ctx.drawImage(image, x - iconSize / 2, y - iconSize / 2, iconSize, iconSize);
      ctx.restore();
    };
    image.src = item.icon;
  });
}

function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);
  return ctx;
}

function drawGrid(ctx, width, height, pad, min = 0, max = 1, options = {}) {
  ctx.strokeStyle = "rgba(216,163,58,.18)";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#f3d99b";
  ctx.font = "12px Georgia";
  const ySteps = options.yLabels ? options.yLabels.length - 1 : 3;
  for (let i = 0; i <= ySteps; i += 1) {
    const y = pad + i * ((height - pad * 2) / ySteps);
    const value = options.invert ? min + i * ((max - min) / ySteps) : max - i * ((max - min) / ySteps);
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(width - pad, y);
    ctx.stroke();
    ctx.textAlign = "right";
    const label = options.yLabels ? options.yLabels[i] : (options.formatY || defaultNumber)(value);
    ctx.fillText(label, pad - 7, y + 4);
  }
  ctx.strokeStyle = "rgba(216,163,58,.35)";
  ctx.beginPath();
  ctx.moveTo(pad, pad);
  ctx.lineTo(pad, height - pad);
  ctx.lineTo(width - pad, height - pad);
  ctx.stroke();

  const xCount = options.xCount || 0;
  if (xCount > 0) {
    ctx.textAlign = "center";
    for (let i = 0; i < xCount; i += 1) {
      const x = pad + i * ((width - pad * 2) / Math.max(xCount - 1, 1));
      ctx.fillText(String(i + 1), x, height - 7);
    }
  }
}

function defaultNumber(value) {
  return String(Math.round(value * 10) / 10);
}

function compactNumber(value) {
  if (value >= 1000000) return `${Math.round(value / 100000) / 10}M`;
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return String(Math.round(value));
}
