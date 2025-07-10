class TinTextExtractor {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.captureBtn = document.getElementById('captureBtn');
        this.startCameraBtn = document.getElementById('startCamera');
        this.stopCameraBtn = document.getElementById('stopCamera');
        this.previewImage = document.getElementById('previewImage');
        this.capturedImage = document.getElementById('capturedImage');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.extractionResult = document.getElementById('extractionResult');
        this.textList = document.getElementById('textList');
        this.clearListBtn = document.getElementById('clearList');
        this.exportListBtn = document.getElementById('exportList');
        
        this.stream = null;
        this.extractedTexts = [];
        this.isContinuousMode = false;
        this.continuousInterval = null;
        this.lastExtractedText = '';
        this.consecutiveFailures = 0;
        this.maxConsecutiveFailures = 5;
        this.minConfidence = 60; // Minimum confidence threshold
        
        this.initializeEventListeners();
        this.loadSavedTexts();
    }
    
    initializeEventListeners() {
        this.startCameraBtn.addEventListener('click', () => this.startCamera());
        this.stopCameraBtn.addEventListener('click', () => this.stopCamera());
        this.captureBtn.addEventListener('click', () => this.captureAndExtract());
        this.clearListBtn.addEventListener('click', () => this.clearAllTexts());
        this.exportListBtn.addEventListener('click', () => this.exportTextList());
        
        // Add continuous mode toggle
        this.addContinuousModeToggle();
    }
    
    addContinuousModeToggle() {
        const cameraControls = document.querySelector('.camera-controls');
        const continuousBtn = document.createElement('button');
        continuousBtn.id = 'continuousMode';
        continuousBtn.className = 'btn btn-warning';
        continuousBtn.textContent = 'Start Continuous Mode';
        continuousBtn.addEventListener('click', () => this.toggleContinuousMode());
        cameraControls.appendChild(continuousBtn);
    }
    
    toggleContinuousMode() {
        this.isContinuousMode = !this.isContinuousMode;
        const btn = document.getElementById('continuousMode');
        
        if (this.isContinuousMode) {
            btn.textContent = 'Stop Continuous Mode';
            btn.className = 'btn btn-danger';
            this.captureBtn.disabled = true;
            this.startContinuousCapture();
        } else {
            btn.textContent = 'Start Continuous Mode';
            btn.className = 'btn btn-warning';
            this.captureBtn.disabled = false;
            this.stopContinuousCapture();
        }
    }
    
    startContinuousCapture() {
        this.continuousInterval = setInterval(() => {
            this.captureAndExtract(true);
        }, 3000); // Capture every 3 seconds
    }
    
    stopContinuousCapture() {
        if (this.continuousInterval) {
            clearInterval(this.continuousInterval);
            this.continuousInterval = null;
        }
    }
    
    async startCamera() {
        try {
            const constraints = {
                video: {
                    width: { ideal: 1920, min: 1280 },
                    height: { ideal: 1080, min: 720 },
                    facingMode: 'environment',
                    focusMode: 'continuous',
                    exposureMode: 'continuous',
                    whiteBalanceMode: 'continuous'
                }
            };
            
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;
            
            this.startCameraBtn.disabled = true;
            this.captureBtn.disabled = false;
            this.stopCameraBtn.disabled = false;
            
            this.showResult('Camera started successfully!', 'success');
        } catch (error) {
            console.error('Error accessing camera:', error);
            this.showResult('Error accessing camera. Please check permissions.', 'error');
        }
    }
    
    stopCamera() {
        this.stopContinuousCapture();
        this.isContinuousMode = false;
        
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        this.video.srcObject = null;
        this.startCameraBtn.disabled = false;
        this.captureBtn.disabled = true;
        this.stopCameraBtn.disabled = true;
        this.capturedImage.style.display = 'none';
        
        // Reset continuous mode button
        const btn = document.getElementById('continuousMode');
        if (btn) {
            btn.textContent = 'Start Continuous Mode';
            btn.className = 'btn btn-warning';
        }
        
        this.showResult('Camera stopped.', 'success');
    }
    
    captureAndExtract(isContinuous = false) {
        if (!this.stream) {
            this.showResult('Please start the camera first.', 'error');
            return;
        }
        
        // Capture the current frame
        const context = this.canvas.getContext('2d');
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        context.drawImage(this.video, 0, 0);
        
        // Show preview only for manual captures
        if (!isContinuous) {
            this.previewImage.src = this.canvas.toDataURL('image/jpeg');
            this.capturedImage.style.display = 'block';
        }
        
        // Extract text from the captured image with enhanced processing
        this.extractTextEnhanced(this.canvas, isContinuous);
    }
    
    async extractTextEnhanced(canvas, isContinuous = false) {
        if (!isContinuous) {
            this.showLoading(true);
            this.extractionResult.style.display = 'none';
        }
        
        try {
            // Check if image has enough text-like content
            if (!this.hasTextContent(canvas)) {
                if (!isContinuous) {
                    this.showResult('No text detected in image. Please ensure text is clearly visible.', 'error');
                }
                this.consecutiveFailures++;
                return;
            }
            
            // Enhanced image preprocessing
            const processedCanvas = this.preprocessImage(canvas);
            
            // Single, high-quality OCR attempt with confidence checking
            const result = await this.performOCRWithConfidence(processedCanvas);
            
            if (result.text && result.confidence >= this.minConfidence) {
                this.processExtractedText(result.text, isContinuous, result.confidence);
            } else {
                if (!isContinuous) {
                    this.showResult(`Text detected but confidence too low (${result.confidence}%). Try better lighting or positioning.`, 'error');
                }
                this.consecutiveFailures++;
            }
        } catch (error) {
            console.error('OCR Error:', error);
            if (!isContinuous) {
                this.showResult('Error extracting text. Please try again.', 'error');
            }
            this.consecutiveFailures++;
        } finally {
            if (!isContinuous) {
                this.showLoading(false);
            }
        }
    }
    
    hasTextContent(canvas) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        let edgePixels = 0;
        let totalPixels = data.length / 4;
        
        // Simple edge detection to find text-like structures
        for (let i = 0; i < data.length; i += 4) {
            const gray = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
            
            // Count pixels that could be part of text (not pure white or black)
            if (gray > 50 && gray < 200) {
                edgePixels++;
            }
        }
        
        const textRatio = edgePixels / totalPixels;
        return textRatio > 0.01; // At least 1% of pixels should be text-like
    }
    
    preprocessImage(canvas) {
        const processedCanvas = document.createElement('canvas');
        const ctx = processedCanvas.getContext('2d');
        
        // Set canvas size
        processedCanvas.width = canvas.width;
        processedCanvas.height = canvas.height;
        
        // Draw original image
        ctx.drawImage(canvas, 0, 0);
        
        // Get image data for processing
        const imageData = ctx.getImageData(0, 0, processedCanvas.width, processedCanvas.height);
        const data = imageData.data;
        
        // Apply image enhancements
        for (let i = 0; i < data.length; i += 4) {
            // Convert to grayscale
            const gray = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
            
            // Apply adaptive thresholding
            const threshold = this.calculateAdaptiveThreshold(data, i, processedCanvas.width);
            const binary = gray > threshold ? 255 : 0;
            
            data[i] = binary;     // Red
            data[i + 1] = binary; // Green
            data[i + 2] = binary; // Blue
            // Alpha remains unchanged
        }
        
        // Put processed image data back
        ctx.putImageData(imageData, 0, 0);
        
        return processedCanvas;
    }
    
    calculateAdaptiveThreshold(data, pixelIndex, width) {
        // Simple local threshold calculation
        const x = (pixelIndex / 4) % width;
        const y = Math.floor((pixelIndex / 4) / width);
        
        let sum = 0;
        let count = 0;
        
        // Calculate local average in 5x5 neighborhood
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                
                if (nx >= 0 && nx < width && ny >= 0 && ny < data.length / (4 * width)) {
                    const idx = (ny * width + nx) * 4;
                    const gray = (data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114);
                    sum += gray;
                    count++;
                }
            }
        }
        
        const localAverage = sum / count;
        return localAverage - 10; // Slightly lower than local average
    }
    
    async performOCRWithConfidence(canvas) {
        try {
            const result = await Tesseract.recognize(canvas, 'eng', {
                psm: 6, // Assume uniform block of text
                logger: m => {
                    if (m.status === 'recognizing text') {
                        console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
                    }
                }
            });
            
            // Extract confidence from result
            const confidence = this.calculateConfidence(result);
            const text = result.data.text.trim();
            
            console.log(`OCR Result: "${text}" (Confidence: ${confidence}%)`);
            
            return { text, confidence };
        } catch (error) {
            console.error('OCR attempt failed:', error);
            return { text: '', confidence: 0 };
        }
    }
    
    calculateConfidence(result) {
        if (!result.data.words || result.data.words.length === 0) {
            return 0;
        }
        
        // Calculate average confidence from all detected words
        const totalConfidence = result.data.words.reduce((sum, word) => {
            return sum + (word.confidence || 0);
        }, 0);
        
        const averageConfidence = totalConfidence / result.data.words.length;
        
        // Additional confidence factors
        let confidence = averageConfidence;
        
        // Penalize if too many words have low confidence
        const lowConfidenceWords = result.data.words.filter(word => (word.confidence || 0) < 50).length;
        const lowConfidenceRatio = lowConfidenceWords / result.data.words.length;
        
        if (lowConfidenceRatio > 0.5) {
            confidence *= 0.7; // Reduce confidence if more than 50% of words are low confidence
        }
        
        // Penalize very short text (likely noise)
        if (result.data.text.trim().length < 3) {
            confidence *= 0.5;
        }
        
        return Math.round(confidence);
    }
    
    processExtractedText(text, isContinuous = false, confidence = 0) {
        // Clean up the text
        const cleanedText = this.cleanText(text);
        
        if (!cleanedText) {
            if (!isContinuous) {
                this.showResult('No valid text found after cleaning.', 'error');
            }
            this.consecutiveFailures++;
            return;
        }
        
        // Additional validation to prevent random text
        if (!this.isValidText(cleanedText)) {
            if (!isContinuous) {
                this.showResult('Detected text appears to be invalid or random. Please try again.', 'error');
            }
            this.consecutiveFailures++;
            return;
        }
        
        // Check if text already exists (case-insensitive)
        const isDuplicate = this.extractedTexts.some(item => 
            item.text.toLowerCase() === cleanedText.toLowerCase()
        );
        
        if (isDuplicate) {
            if (!isContinuous) {
                this.showResult(`Text already exists: "${cleanedText}"`, 'duplicate');
            }
            return;
        }
        
        // For continuous mode, check if text is significantly different
        if (isContinuous && this.lastExtractedText) {
            const similarity = this.calculateTextSimilarity(cleanedText, this.lastExtractedText);
            if (similarity > 0.8) { // 80% similarity threshold
                return; // Skip if too similar to last extraction
            }
        }
        
        // Add new text to the list
        const textItem = {
            id: Date.now(),
            text: cleanedText,
            timestamp: new Date().toLocaleString(),
            confidence: confidence,
            imageData: this.canvas.toDataURL('image/jpeg')
        };
        
        this.extractedTexts.push(textItem);
        this.addTextToList(textItem);
        this.saveTexts();
        
        this.lastExtractedText = cleanedText;
        this.consecutiveFailures = 0;
        
        if (!isContinuous) {
            this.showResult(`Successfully extracted: "${cleanedText}" (Confidence: ${confidence}%)`, 'success');
        } else {
            this.showResult(`Auto-extracted: "${cleanedText}" (Confidence: ${confidence}%)`, 'success');
        }
    }
    
    isValidText(text) {
        // Check for common OCR artifacts and random text patterns
        if (text.length < 2) return false;
        
        // Check for repeated characters (common OCR error)
        const repeatedChars = /(.)\1{3,}/;
        if (repeatedChars.test(text)) return false;
        
        // Check for random character sequences
        const randomPatterns = /[aeiou]{4,}|[bcdfghjklmnpqrstvwxyz]{6,}/;
        if (randomPatterns.test(text.toLowerCase())) return false;
        
        // Check for too many special characters
        const specialCharRatio = (text.match(/[^a-zA-Z0-9\s]/g) || []).length / text.length;
        if (specialCharRatio > 0.4) return false;
        
        // Check for all uppercase with no spaces (likely noise)
        if (text === text.toUpperCase() && !text.includes(' ') && text.length > 5) return false;
        
        return true;
    }
    
    calculateTextSimilarity(text1, text2) {
        const longer = text1.length > text2.length ? text1 : text2;
        const shorter = text1.length > text2.length ? text2 : text1;
        
        if (longer.length === 0) {
            return 1.0;
        }
        
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }
    
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }
    
    cleanText(text) {
        return text
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .replace(/[^\w\s\-.,!?()]/g, '') // Remove special characters except basic punctuation
            .trim();
    }
    
    addTextToList(textItem) {
        // Remove empty state if it exists
        const emptyState = this.textList.querySelector('.empty-state');
        if (emptyState) {
            emptyState.remove();
        }
        
        const textItemElement = document.createElement('div');
        textItemElement.className = 'text-item';
        textItemElement.innerHTML = `
            <div class="text-content">
                <div>${textItem.text}</div>
                <div class="text-timestamp">${textItem.timestamp} (Confidence: ${textItem.confidence}%)</div>
            </div>
            <button class="remove-btn" onclick="app.removeText(${textItem.id})" title="Remove">×</button>
        `;
        
        this.textList.appendChild(textItemElement);
        
        // Scroll to the new item
        textItemElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    removeText(id) {
        this.extractedTexts = this.extractedTexts.filter(item => item.id !== id);
        this.saveTexts();
        this.renderTextList();
    }
    
    renderTextList() {
        this.textList.innerHTML = '';
        
        if (this.extractedTexts.length === 0) {
            this.textList.innerHTML = '<p class="empty-state">No text extracted yet. Start by capturing a tin container.</p>';
            return;
        }
        
        this.extractedTexts.forEach(textItem => {
            this.addTextToList(textItem);
        });
    }
    
    clearAllTexts() {
        if (confirm('Are you sure you want to clear all extracted text?')) {
            this.extractedTexts = [];
            this.saveTexts();
            this.renderTextList();
            this.showResult('All text cleared.', 'success');
        }
    }
    
    exportTextList() {
        if (this.extractedTexts.length === 0) {
            this.showResult('No text to export.', 'error');
            return;
        }
        
        const exportData = {
            timestamp: new Date().toISOString(),
            totalItems: this.extractedTexts.length,
            texts: this.extractedTexts.map(item => ({
                text: item.text,
                timestamp: item.timestamp,
                confidence: item.confidence
            }))
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tin-texts-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showResult('Text list exported successfully!', 'success');
    }
    
    saveTexts() {
        try {
            localStorage.setItem('tinTextExtractor_texts', JSON.stringify(this.extractedTexts));
        } catch (error) {
            console.error('Error saving texts:', error);
        }
    }
    
    loadSavedTexts() {
        try {
            const saved = localStorage.getItem('tinTextExtractor_texts');
            if (saved) {
                this.extractedTexts = JSON.parse(saved);
                this.renderTextList();
            }
        } catch (error) {
            console.error('Error loading saved texts:', error);
        }
    }
    
    showLoading(show) {
        this.loadingIndicator.style.display = show ? 'flex' : 'none';
        this.captureBtn.disabled = show;
    }
    
    showResult(message, type) {
        this.extractionResult.innerHTML = message;
        this.extractionResult.className = `result ${type}`;
        this.extractionResult.style.display = 'block';
        
        // Auto-hide success messages after 3 seconds
        if (type === 'success') {
            setTimeout(() => {
                this.extractionResult.style.display = 'none';
            }, 3000);
        }
    }
}

// Initialize the app when the page loads
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new TinTextExtractor();
});

// Handle page visibility changes to stop camera when tab is not visible
document.addEventListener('visibilitychange', () => {
    if (document.hidden && app && app.stream) {
        app.stopCamera();
    }
}); 