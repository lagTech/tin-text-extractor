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
        
        this.initializeEventListeners();
        this.loadSavedTexts();
    }
    
    initializeEventListeners() {
        this.startCameraBtn.addEventListener('click', () => this.startCamera());
        this.stopCameraBtn.addEventListener('click', () => this.stopCamera());
        this.captureBtn.addEventListener('click', () => this.captureAndExtract());
        this.clearListBtn.addEventListener('click', () => this.clearAllTexts());
        this.exportListBtn.addEventListener('click', () => this.exportTextList());
    }
    
    async startCamera() {
        try {
            const constraints = {
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'environment' // Use back camera on mobile
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
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        this.video.srcObject = null;
        this.startCameraBtn.disabled = false;
        this.captureBtn.disabled = true;
        this.stopCameraBtn.disabled = true;
        this.capturedImage.style.display = 'none';
        
        this.showResult('Camera stopped.', 'success');
    }
    
    captureAndExtract() {
        if (!this.stream) {
            this.showResult('Please start the camera first.', 'error');
            return;
        }
        
        // Capture the current frame
        const context = this.canvas.getContext('2d');
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        context.drawImage(this.video, 0, 0);
        
        // Show preview
        this.previewImage.src = this.canvas.toDataURL('image/jpeg');
        this.capturedImage.style.display = 'block';
        
        // Extract text from the captured image
        this.extractText(this.canvas);
    }
    
    async extractText(canvas) {
        this.showLoading(true);
        this.extractionResult.style.display = 'none';
        
        try {
            // Use Tesseract.js for OCR
            const result = await Tesseract.recognize(
                canvas,
                'eng', // English language
                {
                    logger: m => console.log(m) // Optional: log progress
                }
            );
            
            const extractedText = result.data.text.trim();
            
            if (extractedText) {
                this.processExtractedText(extractedText);
            } else {
                this.showResult('No text detected in the image. Please try again with better lighting or positioning.', 'error');
            }
        } catch (error) {
            console.error('OCR Error:', error);
            this.showResult('Error extracting text. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    processExtractedText(text) {
        // Clean up the text
        const cleanedText = this.cleanText(text);
        
        if (!cleanedText) {
            this.showResult('No valid text found after cleaning.', 'error');
            return;
        }
        
        // Check if text already exists (case-insensitive)
        const isDuplicate = this.extractedTexts.some(item => 
            item.text.toLowerCase() === cleanedText.toLowerCase()
        );
        
        if (isDuplicate) {
            this.showResult(`Text already exists: "${cleanedText}"`, 'duplicate');
            return;
        }
        
        // Add new text to the list
        const textItem = {
            id: Date.now(),
            text: cleanedText,
            timestamp: new Date().toLocaleString(),
            imageData: this.canvas.toDataURL('image/jpeg')
        };
        
        this.extractedTexts.push(textItem);
        this.addTextToList(textItem);
        this.saveTexts();
        
        this.showResult(`Successfully extracted: "${cleanedText}"`, 'success');
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
                <div class="text-timestamp">${textItem.timestamp}</div>
            </div>
            <button class="remove-btn" onclick="app.removeText(${textItem.id})" title="Remove">×</button>
        `;
        
        this.textList.appendChild(textItemElement);
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
                timestamp: item.timestamp
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