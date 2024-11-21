class NodeRenderer {
    constructor(mindMap) {
        this.mindMap = mindMap;
    }

    drawNode(node, ctx) {
        const x = node.x * this.mindMap.scale + this.mindMap.offset.x;
        const y = node.y * this.mindMap.scale + this.mindMap.offset.y;
        const width = node.width * this.mindMap.scale;
        const height = node.height * this.mindMap.scale;
        const radius = 10 * this.mindMap.scale;

        // Draw rounded rectangle
        ctx.beginPath();
        ctx.moveTo(x - width/2 + radius, y - height/2);
        ctx.lineTo(x + width/2 - radius, y - height/2);
        ctx.quadraticCurveTo(x + width/2, y - height/2, x + width/2, y - height/2 + radius);
        ctx.lineTo(x + width/2, y + height/2 - radius);
        ctx.quadraticCurveTo(x + width/2, y + height/2, x + width/2 - radius, y + height/2);
        ctx.lineTo(x - width/2 + radius, y + height/2);
        ctx.quadraticCurveTo(x - width/2, y + height/2, x - width/2, y + height/2 - radius);
        ctx.lineTo(x - width/2, y - height/2 + radius);
        ctx.quadraticCurveTo(x - width/2, y - height/2, x - width/2 + radius, y - height/2);
        ctx.closePath();

        // Fill with node color
        const nodeColor = node.nodeColor || this.mindMap.defaultNodeColor;
        ctx.fillStyle = nodeColor;
        
        // Create darker border color
        const borderColor = this.mindMap.darkenColor(nodeColor, 0.15);
        ctx.strokeStyle = borderColor;
        
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();

        // Draw text
        if (node.text && node !== this.mindMap.editingNode) {
            ctx.font = `${node.fontSize * this.mindMap.scale}px Arial`;
            ctx.fillStyle = node.textColor;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(node.text, x, y);
        }
    }

    drawIndicator(x, y, width, height, radius, padding, color, lineDash, ctx) {
        ctx.beginPath();
        const p = padding;
        ctx.moveTo(x - width/2 - p + radius, y - height/2 - p);
        ctx.lineTo(x + width/2 + p - radius, y - height/2 - p);
        ctx.quadraticCurveTo(x + width/2 + p, y - height/2 - p, x + width/2 + p, y - height/2 - p + radius);
        ctx.lineTo(x + width/2 + p, y + height/2 + p - radius);
        ctx.quadraticCurveTo(x + width/2 + p, y + height/2 + p, x + width/2 + p - radius, y + height/2 + p);
        ctx.lineTo(x - width/2 - p + radius, y + height/2 + p);
        ctx.quadraticCurveTo(x - width/2 - p, y + height/2 + p, x - width/2 - p, y + height/2 + p - radius);
        ctx.lineTo(x - width/2 - p, y - height/2 - p + radius);
        ctx.quadraticCurveTo(x - width/2 - p, y - height/2 - p, x - width/2 - p + radius, y - height/2 - p);
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        if (lineDash.length > 0) {
            ctx.setLineDash(lineDash);
        } else {
            ctx.setLineDash([]);
        }
        ctx.stroke();
        ctx.setLineDash([]);
    }

    findNodeAtPosition(pos) {
        return this.mindMap.nodes.find(node => {
            const nodeX = node.x * this.mindMap.scale + this.mindMap.offset.x;
            const nodeY = node.y * this.mindMap.scale + this.mindMap.offset.y;
            const width = node.width * this.mindMap.scale;
            const height = node.height * this.mindMap.scale;
            
            return pos.x >= nodeX - width/2 &&
                   pos.x <= nodeX + width/2 &&
                   pos.y >= nodeY - height/2 &&
                   pos.y <= nodeY + height/2;
        });
    }

    checkNodeOverlap(node1) {
        const nearbyNodes = this.mindMap.nodes.filter(node2 => {
            if (node1 === node2) return false;
            
            const dx = Math.abs(node1.x - node2.x);
            const dy = Math.abs(node1.y - node2.y);
            const maxDistance = (node1.width + node2.width) / 2;
            
            return dx < maxDistance && dy < maxDistance;
        });

        return nearbyNodes.some(node2 => {
            const dx = Math.abs(node1.x - node2.x);
            const dy = Math.abs(node1.y - node2.y);
            
            return dx < (node1.width + node2.width) / 2 &&
                   dy < (node1.height + node2.height) / 2;
        });
    }

    updateNodeSize(node) {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.font = `${node.fontSize}px Arial`;
        
        const metrics = tempCtx.measureText(node.text);
        const textWidth = metrics.width;
        const textHeight = node.fontSize;

        const padding = node.padding || 20;
        node.width = Math.max(textWidth + (padding * 2), 80);
        node.height = textHeight + (padding * 2);
    }
} 