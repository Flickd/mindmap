class EdgeRenderer {
    constructor(mindMap) {
        this.mindMap = mindMap;
    }

    drawEdge(edge, ctx) {
        const startNode = edge.start;
        const endNode = edge.end;
        
        const startCenter = {
            x: startNode.x * this.mindMap.scale + this.mindMap.offset.x,
            y: startNode.y * this.mindMap.scale + this.mindMap.offset.y
        };
        const endCenter = {
            x: endNode.x * this.mindMap.scale + this.mindMap.offset.x,
            y: endNode.y * this.mindMap.scale + this.mindMap.offset.y
        };

        const startIntersect = this.getNodeIntersection(startNode, startCenter, endCenter);
        const endIntersect = this.getNodeIntersection(endNode, endCenter, startCenter);

        // Calculate edge thickness based on start node size
        const baseThickness = Math.min(Math.max(startNode.width / 25, 2), 500);
        const edgeThickness = baseThickness * this.mindMap.scale;

        // Draw main edge line
        ctx.beginPath();
        ctx.moveTo(startIntersect.x, startIntersect.y);
        ctx.lineTo(endIntersect.x, endIntersect.y);
        ctx.strokeStyle = '#666';
        ctx.lineWidth = edgeThickness;
        ctx.stroke();

        // Draw arrow if needed
        if (edge.style === 'arrow') {
            this.drawArrow(ctx, startIntersect, endIntersect, edgeThickness);
        }
    }

    drawArrow(ctx, startIntersect, endIntersect, edgeThickness) {
        const arrowLength = edgeThickness * 4;
        const arrowWidth = Math.PI / 6;
        const angle = Math.atan2(
            endIntersect.y - startIntersect.y,
            endIntersect.x - startIntersect.x
        );

        ctx.beginPath();
        ctx.moveTo(
            endIntersect.x - arrowLength * Math.cos(angle - arrowWidth),
            endIntersect.y - arrowLength * Math.sin(angle - arrowWidth)
        );
        ctx.lineTo(endIntersect.x, endIntersect.y);
        ctx.lineTo(
            endIntersect.x - arrowLength * Math.cos(angle + arrowWidth),
            endIntersect.y - arrowLength * Math.sin(angle + arrowWidth)
        );
        ctx.strokeStyle = '#666';
        ctx.lineWidth = edgeThickness;
        ctx.stroke();
        ctx.fillStyle = '#666';
        ctx.fill();
    }

    getNodeIntersection(node, start, end) {
        const width = node.width * this.mindMap.scale;
        const height = node.height * this.mindMap.scale;
        const radius = 10 * this.mindMap.scale;

        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const angle = Math.atan2(dy, dx);

        const halfWidth = width / 2;
        const halfHeight = height / 2;
        
        let intersectX, intersectY;
        
        if (Math.abs(Math.cos(angle)) * halfHeight > Math.abs(Math.sin(angle)) * halfWidth) {
            intersectX = Math.sign(Math.cos(angle)) * halfWidth;
            intersectY = intersectX * Math.tan(angle);
            
            if (Math.abs(intersectY) > halfHeight) {
                intersectY = Math.sign(intersectY) * halfHeight;
                intersectX = intersectY / Math.tan(angle);
            }
        } else {
            intersectY = Math.sign(Math.sin(angle)) * halfHeight;
            intersectX = intersectY / Math.tan(angle);
            
            if (Math.abs(intersectX) > halfWidth) {
                intersectX = Math.sign(intersectX) * halfWidth;
                intersectY = intersectX * Math.tan(angle);
            }
        }

        return {
            x: start.x + intersectX,
            y: start.y + intersectY
        };
    }

    findEdgeAtPosition(pos) {
        return this.mindMap.edges.find(edge => {
            const startCenter = {
                x: edge.start.x * this.mindMap.scale + this.mindMap.offset.x,
                y: edge.start.y * this.mindMap.scale + this.mindMap.offset.y
            };
            const endCenter = {
                x: edge.end.x * this.mindMap.scale + this.mindMap.offset.x,
                y: edge.end.y * this.mindMap.scale + this.mindMap.offset.y
            };

            const startIntersect = this.getNodeIntersection(edge.start, startCenter, endCenter);
            const endIntersect = this.getNodeIntersection(edge.end, endCenter, startCenter);

            const baseThickness = Math.min(Math.max(edge.start.width / 50, 2), 8);
            const hitArea = Math.max(10, baseThickness * 3) / this.mindMap.scale;

            const distance = this.pointToLineDistance(pos, startIntersect, endIntersect);
            const withinBounds = this.isPointNearLineSegment(pos, startIntersect, endIntersect);

            return distance < hitArea && withinBounds;
        });
    }

    pointToLineDistance(point, lineStart, lineEnd) {
        const numerator = Math.abs(
            (lineEnd.y - lineStart.y) * point.x -
            (lineEnd.x - lineStart.x) * point.y +
            lineEnd.x * lineStart.y -
            lineEnd.y * lineStart.x
        );
        const denominator = Math.sqrt(
            Math.pow(lineEnd.y - lineStart.y, 2) +
            Math.pow(lineEnd.x - lineStart.x, 2)
        );
        return numerator / denominator;
    }

    isPointNearLineSegment(point, start, end) {
        const lineLength = Math.sqrt(
            Math.pow(end.x - start.x, 2) + 
            Math.pow(end.y - start.y, 2)
        );
        
        if (lineLength === 0) return false;

        const dot = (
            ((point.x - start.x) * (end.x - start.x)) +
            ((point.y - start.y) * (end.y - start.y))
        ) / Math.pow(lineLength, 2);

        const padding = 20 / this.mindMap.scale;
        return dot >= -padding/lineLength && dot <= 1 + padding/lineLength;
    }
} 