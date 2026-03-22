// Simple script to create canvas-based icons
const fs = require('fs');
const { createCanvas } = require('canvas');

// Create icons of different sizes
const sizes = [16, 48, 128];

sizes.forEach(size => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Fill background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  
  // Draw a paintbrush icon
  ctx.fillStyle = '#4285f4'; // Google blue
  
  // Draw brush handle
  const handleWidth = size * 0.2;
  const brushSize = size * 0.4;
  ctx.fillRect(size * 0.25, size * 0.25, handleWidth, size * 0.5);
  
  // Draw brush head
  ctx.beginPath();
  ctx.moveTo(size * 0.25 + handleWidth, size * 0.25);
  ctx.lineTo(size * 0.75, size * 0.4);
  ctx.lineTo(size * 0.75, size * 0.6);
  ctx.lineTo(size * 0.25 + handleWidth, size * 0.75);
  ctx.closePath();
  ctx.fill();
  
  // Draw outline
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = Math.max(1, size * 0.03);
  ctx.strokeRect(0, 0, size, size);
  
  // Save as PNG
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(`./images/icon${size}.png`, buffer);
  
  console.log(`Created icon${size}.png`);
});

console.log('All icons created!'); 