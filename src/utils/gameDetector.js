import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

let model = null;

export const initializeModel = async () => {
    if (model) return model;
    try {
        model = await cocoSsd.load();
        console.log('Model loaded successfully');
        return model;
    } catch (error) {
        console.error('Error loading model:', error);
        throw error;
    }
};

export const detectObjects = async (videoElement) => {
    if (!model) {
        throw new Error('Model not initialized');
    }
    try {
        const predictions = await model.estimateObjects(videoElement, 0.5);
        return predictions;
    } catch (error) {
        console.error('Error detecting objects:', error);
        return [];
    }
};

export const classifyBoxes = (predictions) => {
    const boxes = { bombs: [], xMarks: [], safe: [], all: predictions };
    predictions.forEach((prediction) => {
        const class_name = prediction.class.toLowerCase();
        if (class_name.includes('apple') || class_name.includes('sports ball')) {
            boxes.bombs.push(prediction);
        } else if (class_name.includes('x') || class_name.includes('cross')) {
            boxes.xMarks.push(prediction);
        } else {
            boxes.safe.push(prediction);
        }
    });
    return boxes;
};

export const drawDetections = (ctx, predictions, gameState) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    predictions.forEach((prediction) => {
        const [x, y, width, height] = prediction.bbox;
        const score = (prediction.score * 100).toFixed(1);
        let color = '#00FF00';
        let label = `${prediction.class} (${score}%)`;
        const class_name = prediction.class.toLowerCase();
        if (class_name.includes('apple') || class_name.includes('sports ball')) {
            color = '#FF0000';
            label = `BOMB: ${prediction.class}`;
        } else if (class_name.includes('x') || class_name.includes('cross')) {
            color = '#FFFF00';
            label = `X MARK: ${prediction.class}`;
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
        ctx.fillStyle = color;
        ctx.font = '14px Arial';
        const textWidth = ctx.measureText(label).width;
        ctx.fillRect(x, y - 25, textWidth + 10, 25);
        ctx.fillStyle = '#000000';
        ctx.fillText(label, x + 5, y - 7);
    });
};

export const calculateSafeZones = (canvasWidth, canvasHeight, predictions) => {
    const dangerZones = predictions
        .filter(p => {
            const class_name = p.class.toLowerCase();
            return class_name.includes('apple') || class_name.includes('sports ball') || class_name.includes('x') || class_name.includes('cross');
        })
        .map(p => ({ x: p.bbox[0], y: p.bbox[1], width: p.bbox[2], height: p.bbox[3] }));

    const cellSize = 50;
    const safeZones = [];
    for (let x = 0; x < canvasWidth; x += cellSize) {
        for (let y = 0; y < canvasHeight; y += cellSize) {
            const cellBox = { x, y, width: cellSize, height: cellSize };
            const isDangerous = dangerZones.some(danger => boxesOverlap(cellBox, danger));
            if (!isDangerous) {
                safeZones.push(cellBox);
            }
        }
    }
    return safeZones;
};

const boxesOverlap = (box1, box2) => {
    return !(
        box1.x + box1.width < box2.x ||
        box2.x + box2.width < box1.x ||
        box1.y + box1.height < box2.y ||
        box2.y + box2.height < box1.y
    );
};

export const drawSafeZones = (ctx, safeZones) => {
    ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 1;
    safeZones.forEach((zone) => {
        ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
        ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
    });
};

export const getPerformanceMetrics = (startTime) => {
    const endTime = performance.now();
    const latency = endTime - startTime;
    const fps = Math.round(1000 / latency);
    return { latency: latency.toFixed(2), fps: fps };
};