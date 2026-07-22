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

  drawScatter(canvas, points, options = {}) {
    const ctx = setupCanvas(canvas);
    const { width, height } = canvas.getBoundingClientRect();
    const pad = {
      left: width < 520 ? 52 : 68,
      right: width < 520 ? 22 : 38,
      top: 42,
      bottom: 62
    };
    const plotWidth = Math.max(80, width - pad.left - pad.right);
    const plotHeight = Math.max(100, height - pad.top - pad.bottom);

    if (!points.length) {
      ctx.fillStyle = "#9f967f";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("戦績データがありません", width / 2, height / 2);
      return;
    }

    const maxX = niceScatterMax(Math.max(...points.map(point => point.x), 1) * 1.12);
    const maxY = niceScatterMax(Math.max(...points.map(point => point.y), .5) * 1.12);
    const xAt = value => pad.left + value / maxX * plotWidth;
    const yAt = value => pad.top + value / maxY * plotHeight;

    if (options.averageX > 0 && options.averageY >= 0) {
      const averageX = xAt(options.averageX);
      const averageY = yAt(options.averageY);
      ctx.fillStyle = "rgba(69, 155, 96, .07)";
      ctx.fillRect(averageX, pad.top, pad.left + plotWidth - averageX, averageY - pad.top);
      ctx.fillStyle = "rgba(119, 209, 143, .7)";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText("高被ダメージ・低Down", pad.left + plotWidth - 5, pad.top + 16);
    }

    ctx.font = "12px sans-serif";
    for (let i = 0; i <= 4; i += 1) {
      const x = pad.left + i / 4 * plotWidth;
      const y = pad.top + i / 4 * plotHeight;
      ctx.strokeStyle = "rgba(216,163,58,.17)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, pad.top);
      ctx.lineTo(x, pad.top + plotHeight);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + plotWidth, y);
      ctx.stroke();

      ctx.fillStyle = "#d7cda8";
      ctx.textAlign = "center";
      ctx.fillText(compactNumber(maxX * i / 4), x, height - pad.bottom + 22);
      ctx.textAlign = "right";
      ctx.fillText(defaultNumber(maxY * i / 4), pad.left - 9, y + 4);
    }

    ctx.strokeStyle = "rgba(216,163,58,.55)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top);
    ctx.lineTo(pad.left, pad.top + plotHeight);
    ctx.lineTo(pad.left + plotWidth, pad.top + plotHeight);
    ctx.stroke();

    if (options.averageX > 0) {
      ctx.save();
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = "rgba(255,211,107,.66)";
      ctx.beginPath();
      ctx.moveTo(xAt(options.averageX), pad.top);
      ctx.lineTo(xAt(options.averageX), pad.top + plotHeight);
      ctx.stroke();
      if (options.averageY >= 0) {
        ctx.beginPath();
        ctx.moveTo(pad.left, yAt(options.averageY));
        ctx.lineTo(pad.left + plotWidth, yAt(options.averageY));
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.fillStyle = "#f3d99b";
    ctx.font = "13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("平均被ダメージ →", pad.left + plotWidth / 2, height - 10);
    ctx.textAlign = "left";
    ctx.fillText("平均Down（上ほど少ない）", pad.left, 22);

    const iconSize = width < 520 ? 30 : 38;
    points.forEach(point => {
      const x = xAt(point.x);
      const y = yAt(point.y);
      const drawPoint = image => {
        ctx.save();
        ctx.globalAlpha = point.matches < 3 ? .45 : 1;
        if (image) ctx.drawImage(image, x - iconSize / 2, y - iconSize / 2, iconSize, iconSize);
        else {
          ctx.fillStyle = "#d8a33a";
          ctx.fillRect(x - 5, y - 5, 10, 10);
        }
        ctx.font = `700 ${width < 520 ? 9 : 11}px sans-serif`;
        ctx.textAlign = "center";
        ctx.lineWidth = 3;
        ctx.strokeStyle = "rgba(0, 8, 12, .9)";
        ctx.strokeText(point.id, x, y + iconSize / 2 + 12);
        ctx.fillStyle = "#ffe09c";
        ctx.fillText(point.id, x, y + iconSize / 2 + 12);
        ctx.restore();
      };
      if (!point.icon) {
        drawPoint(null);
        return;
      }
      const image = new Image();
      image.onload = () => drawPoint(image);
      image.onerror = () => drawPoint(null);
      image.src = point.icon;
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
  const iconSize = Math.max(26, Math.min(41, ringWidth * 1.34));
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
      if (item.badge) drawDonutIconBadge(ctx, x, y, iconSize, item.badge);
      ctx.restore();
    };
    image.src = item.icon;
  });
}

function drawDonutIconBadge(ctx, x, y, iconSize, badge) {
  const size = Math.max(14, Math.round(iconSize * .42));
  const left = x + iconSize / 2 - size * .78;
  const top = y + iconSize / 2 - size * .78;
  ctx.fillStyle = "rgba(3, 12, 16, .96)";
  ctx.strokeStyle = "#e0ad51";
  ctx.lineWidth = 1.5;
  ctx.fillRect(left, top, size, size);
  ctx.strokeRect(left + .75, top + .75, size - 1.5, size - 1.5);
  ctx.fillStyle = "#ffe7a4";
  ctx.font = `700 ${Math.max(10, Math.round(size * .68))}px "Yu Mincho", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(badge, left + size / 2, top + size / 2 + .5);
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

function niceScatterMax(value) {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const scaled = value / power;
  const nice = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 2.5 ? 2.5 : scaled <= 5 ? 5 : 10;
  return nice * power;
}
