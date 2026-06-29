const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

class VideoCompressor {
    constructor() {
        this.selectedFiles = [];
        this.currentWidth = 900;
        this.currentHeight = 1600;
        this.currentQuality = 90;
        this.pluginPath = '';
        this.ffmpegPath = '';
    }

    init(plugin) {
        this.pluginPath = plugin.path;
        this.findFfmpeg();
        this.bindEvents();
        this.loadSelectedFiles();
    }

    findFfmpeg() {
        const platform = process.platform;
        let ffmpegBinName = 'ffmpeg';
        if (platform === 'win32') {
            ffmpegBinName = 'ffmpeg.exe';
        }
        
        const localFfmpeg = path.join(this.pluginPath, 'bin', ffmpegBinName);
        if (fs.existsSync(localFfmpeg)) {
            this.ffmpegPath = localFfmpeg;
            console.log('使用本地ffmpeg:', this.ffmpegPath);
        } else if (fs.existsSync('/usr/local/bin/ffmpeg')) {
            this.ffmpegPath = '/usr/local/bin/ffmpeg';
            console.log('使用系统ffmpeg:', this.ffmpegPath);
        } else {
            this.ffmpegPath = 'ffmpeg';
            console.log('使用PATH中的ffmpeg');
        }
    }

    bindEvents() {
        document.querySelectorAll('.preset-btn[data-width]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectPreset(e.currentTarget);
            });
        });

        document.querySelectorAll('.quality-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectQuality(e.currentTarget);
            });
        });

        document.getElementById('customWidthBtn').addEventListener('click', () => {
            const btn = document.getElementById('customWidthBtn');
            const input = document.getElementById('customWidth');
            btn.style.display = 'none';
            input.style.display = 'block';
            input.focus();
        });

        document.getElementById('customWidth').addEventListener('blur', () => {
            const btn = document.getElementById('customWidthBtn');
            const input = document.getElementById('customWidth');
            input.style.display = 'none';
            btn.style.display = 'flex';
            const val = input.value;
            if (val) {
                document.getElementById('customWidthText').textContent = val;
            } else {
                document.getElementById('customWidthText').textContent = '宽';
            }
        });

        document.getElementById('customHeightBtn').addEventListener('click', () => {
            const btn = document.getElementById('customHeightBtn');
            const input = document.getElementById('customHeight');
            btn.style.display = 'none';
            input.style.display = 'block';
            input.focus();
        });

        document.getElementById('customHeight').addEventListener('blur', () => {
            const btn = document.getElementById('customHeightBtn');
            const input = document.getElementById('customHeight');
            input.style.display = 'none';
            btn.style.display = 'flex';
            const val = input.value;
            if (val) {
                document.getElementById('customHeightText').textContent = val;
            } else {
                document.getElementById('customHeightText').textContent = '高';
            }
        });

        document.getElementById('applyCustom').addEventListener('click', () => {
            this.applyCustomSize();
        });

        document.getElementById('compressBtn').addEventListener('click', () => {
            this.startCompression();
        });
    }

    selectPreset(btn) {
        document.querySelectorAll('.preset-btn[data-width]').forEach(b => {
            b.classList.remove('active');
        });
        btn.classList.add('active');
        
        this.currentWidth = parseInt(btn.dataset.width);
        this.currentHeight = parseInt(btn.dataset.height);
        this.updateCurrentSettings();
    }

    selectQuality(btn) {
        document.querySelectorAll('.quality-btn').forEach(b => {
            b.classList.remove('active');
        });
        btn.classList.add('active');
        
        this.currentQuality = parseInt(btn.dataset.quality);
        this.updateCurrentSettings();
    }

    updateCurrentSettings() {
        const settingsDiv = document.getElementById('currentSettings');
        if (settingsDiv) {
            settingsDiv.style.display = 'flex';
            document.getElementById('settingResolution').textContent = `${this.currentWidth}×${this.currentHeight}`;
            document.getElementById('settingQuality').textContent = `${this.currentQuality}%`;
        }
    }

    applyCustomSize() {
        const width = parseInt(document.getElementById('customWidth').value);
        const height = parseInt(document.getElementById('customHeight').value);

        if (width && height && width >= 100 && height >= 100) {
            this.currentWidth = width;
            this.currentHeight = height;
            
            document.querySelectorAll('.preset-btn[data-width]').forEach(b => {
                b.classList.remove('active');
            });
            
            this.updateCurrentSettings();
            this.showNotification('自定义尺寸已应用: ' + width + '×' + height);
        } else {
            this.showNotification('请输入有效的尺寸（最小100px）');
        }
    }

    async loadSelectedFiles() {
        try {
            const selectedItems = await eagle.item.getSelected();
            console.log('选中的文件数量:', selectedItems ? selectedItems.length : 0);
            
            if (selectedItems && selectedItems.length > 0) {
                console.log('第一个文件属性:', Object.keys(selectedItems[0]));
                console.log('第一个文件:', JSON.stringify(selectedItems[0], null, 2));
                
                this.selectedFiles = selectedItems.filter(item => {
                    let ext = (item.ext || '').toLowerCase();
                    console.log('文件:', item.name, '扩展名:', ext);
                    return ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext);
                });

                console.log('过滤后的视频文件:', this.selectedFiles.length);

                if (this.selectedFiles.length > 0) {
                    this.updateFileInfo();
                    const compressBtn = document.getElementById('compressBtn');
                    compressBtn.disabled = false;
                    compressBtn.textContent = '开始压缩';
                    compressBtn.classList.remove('completing', 'completed');
                    this.updateCurrentSettings();
                } else {
                    document.getElementById('fileInfoText').textContent = '选中的文件中没有视频文件';
                    this.hideStatusIndicator();
                    const compressBtn = document.getElementById('compressBtn');
                    compressBtn.disabled = true;
                    compressBtn.textContent = '开始压缩';
                    compressBtn.classList.remove('completing', 'completed');
                    document.getElementById('currentSettings').style.display = 'none';
                }
            } else {
                document.getElementById('fileInfoText').textContent = '请先选择视频文件';
                this.hideStatusIndicator();
                const compressBtn = document.getElementById('compressBtn');
                compressBtn.disabled = true;
                compressBtn.textContent = '开始压缩';
                compressBtn.classList.remove('completing', 'completed');
                document.getElementById('currentSettings').style.display = 'none';
            }
        } catch (error) {
            console.error('获取选中文件失败:', error);
            document.getElementById('fileInfoText').textContent = '获取文件失败，请重试';
            this.hideStatusIndicator();
        }
    }

    updateFileInfo() {
        const fileInfoText = document.getElementById('fileInfoText');
        const fileInfoBox = document.getElementById('fileInfoBox');
        if (fileInfoText) {
            fileInfoText.textContent = `已选择 ${this.selectedFiles.length} 个视频文件`;
        }
        if (fileInfoBox) {
            fileInfoBox.classList.remove('compressing', 'completed');
        }
        this.hideStatusIndicator();
    }

    hideStatusIndicator() {
        const statusIndicator = document.getElementById('statusIndicator');
        const statusSpinner = document.getElementById('statusSpinner');
        const statusCheck = document.getElementById('statusCheck');
        if (statusIndicator) {
            statusIndicator.classList.remove('show');
        }
        if (statusSpinner) {
            statusSpinner.style.display = 'none';
        }
        if (statusCheck) {
            statusCheck.style.display = 'none';
        }
    }

    showCompressing() {
        const statusIndicator = document.getElementById('statusIndicator');
        const statusSpinner = document.getElementById('statusSpinner');
        const statusCheck = document.getElementById('statusCheck');
        if (statusIndicator) {
            statusIndicator.classList.add('show');
        }
        if (statusSpinner) {
            statusSpinner.style.display = 'block';
        }
        if (statusCheck) {
            statusCheck.style.display = 'none';
        }
    }

    showCompleted() {
        const statusIndicator = document.getElementById('statusIndicator');
        const statusSpinner = document.getElementById('statusSpinner');
        const statusCheck = document.getElementById('statusCheck');
        if (statusIndicator) {
            statusIndicator.classList.add('show');
        }
        if (statusSpinner) {
            statusSpinner.style.display = 'none';
        }
        if (statusCheck) {
            statusCheck.style.display = 'block';
        }
    }

    async startCompression() {
        if (this.selectedFiles.length === 0) {
            this.showNotification('请先选择视频文件');
            return;
        }

        const compressBtn = document.getElementById('compressBtn');
        const fileInfoText = document.getElementById('fileInfoText');
        const fileInfoBox = document.getElementById('fileInfoBox');

        this.showCompressing();
        fileInfoBox.classList.add('compressing');
        fileInfoBox.classList.remove('completed');

        compressBtn.textContent = '压缩中';
        compressBtn.classList.add('completing');
        compressBtn.disabled = true;

        fileInfoText.textContent = '正在压缩中';

        for (let i = 0; i < this.selectedFiles.length; i++) {
            const file = this.selectedFiles[i];
            try {
                await this.processVideo(file, i + 1, this.selectedFiles.length);
            } catch (error) {
                console.error('处理视频失败:', error);
            }
        }

        this.showCompleted();
        fileInfoBox.classList.remove('compressing');
        fileInfoBox.classList.add('completed');
        
        compressBtn.textContent = '压缩完成';
        compressBtn.classList.remove('completing');
        compressBtn.classList.add('completed');
        
        fileInfoText.textContent = '压缩完成';
    }

    getCrfValue(quality) {
        if (quality >= 90) return 28;
        if (quality >= 70) return 32;
        return 38;
    }

    async processVideo(file, currentIndex, totalFiles) {
        const inputPath = file.path || file.filePath;
        if (!inputPath) {
            throw new Error('无法获取文件路径');
        }
        
        console.log('处理文件路径:', inputPath);
        
        const filename = path.basename(inputPath, path.extname(inputPath));
        const ext = path.extname(inputPath);
        const outputDir = path.join(path.dirname(inputPath), 'compressed');
        
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const outputPath = path.join(outputDir, `${filename}_${this.currentWidth}x${this.currentHeight}${ext}`);
        const thumbnailPath = path.join(outputDir, `${filename}_${this.currentWidth}x${this.currentHeight}.jpg`);

        await this.generateThumbnail(inputPath, thumbnailPath);
        await this.compressVideo(inputPath, outputPath);
        await this.addToEagle(outputPath, thumbnailPath, file);

        try {
            if (fs.existsSync(outputPath)) {
                fs.unlinkSync(outputPath);
            }
            if (fs.existsSync(thumbnailPath)) {
                fs.unlinkSync(thumbnailPath);
            }
            
            if (fs.existsSync(outputDir) && fs.readdirSync(outputDir).length === 0) {
                fs.rmdirSync(outputDir);
            }
        } catch (cleanupError) {
            console.error('清理临时文件失败:', cleanupError);
        }
    }

    generateThumbnail(inputPath, outputPath) {
        return new Promise((resolve, reject) => {
            const cmd = `"${this.ffmpegPath}" -i "${inputPath}" -ss 00:00:00 -vframes 1 -vf "scale=w=${this.currentWidth}:h=${this.currentHeight}:force_original_aspect_ratio=increase,crop=${this.currentWidth}:${this.currentHeight}" -y -update 1 "${outputPath}"`;
            console.log('生成封面命令:', cmd);
            
            exec(cmd, (error, stdout, stderr) => {
                if (error) {
                    console.error('生成封面失败:', stderr);
                    reject(new Error('封面生成失败'));
                } else {
                    resolve();
                }
            });
        });
    }

    compressVideo(inputPath, outputPath) {
        return new Promise((resolve, reject) => {
            const crf = this.getCrfValue(this.currentQuality);
            const cmd = `"${this.ffmpegPath}" -i "${inputPath}" -vf "scale=w=${this.currentWidth}:h=${this.currentHeight}:force_original_aspect_ratio=increase,crop=${this.currentWidth}:${this.currentHeight},format=yuv420p" -c:v hevc -tag:v hvc1 -crf ${crf} -y "${outputPath}"`;
            console.log('压缩视频命令:', cmd);
            
            exec(cmd, (error, stdout, stderr) => {
                if (error) {
                    console.error('压缩视频失败:', stderr);
                    reject(new Error('视频压缩失败'));
                } else {
                    resolve();
                }
            });
        });
    }

    async addToEagle(videoPath, thumbnailPath, originalFile) {
        try {
            let folderIds = [];
            if (originalFile.folders && Array.isArray(originalFile.folders)) {
                folderIds = originalFile.folders;
            } else if (originalFile.folderId) {
                folderIds = [originalFile.folderId];
            }
            console.log('文件夹IDs:', folderIds);
            
            const tags = originalFile.tags || [];

            await eagle.item.addFromPath(videoPath, {
                name: originalFile.name,
                tags: tags,
                folders: folderIds,
                annotation: `压缩至 ${this.currentWidth}x${this.currentHeight}，质量 ${this.currentQuality}%`
            });

            const coverName = originalFile.name.replace(/\.[^/.]+$/, '') + '_封面';
            const newTags = [...tags, '封面'];
            await eagle.item.addFromPath(thumbnailPath, {
                name: coverName,
                tags: newTags,
                folders: folderIds,
                annotation: `${originalFile.name} 的封面`
            });
        } catch (error) {
            console.error('添加到Eagle失败:', error);
            throw new Error('添加到Eagle失败: ' + error.message);
        }
    }

    addResultItem(filename, status, message) {
        const resultItems = document.getElementById('resultItems');
        const item = document.createElement('div');
        item.className = `result-item ${status}`;
        
        const icon = status === 'success' ? '✅' : '❌';
        
        item.innerHTML = `
            <span class="result-icon">${icon}</span>
            <div class="result-content">
                <h4>${filename}</h4>
                <p>${message}</p>
            </div>
            <span class="status-dot ${status}"></span>
        `;
        resultItems.appendChild(item);
    }

    showNotification(message) {
        if (typeof eagle !== 'undefined' && eagle.app && eagle.app.alert) {
            eagle.app.alert(message);
        } else {
            alert(message);
        }
    }
}

let compressor = null;

eagle.onPluginCreate((plugin) => {
    console.log('eagle.onPluginCreate');
    console.log('插件路径:', plugin.path);
    
    compressor = new VideoCompressor();
    compressor.init(plugin);
});

eagle.onPluginRun(() => {
    console.log('eagle.onPluginRun');
});

eagle.onPluginShow(() => {
    console.log('eagle.onPluginShow');
    if (compressor) {
        compressor.loadSelectedFiles();
    }
});

eagle.onPluginHide(() => {
    console.log('eagle.onPluginHide');
});

eagle.onPluginBeforeExit((event) => {
    console.log('eagle.onPluginBeforeExit');
});