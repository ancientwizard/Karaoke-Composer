// Audio file storage service with multiple persistence strategies
import type { AudioFile } from '@/types/karaoke'

interface StoredAudioFile {
  name: string
  size: number
  type: string
  lastModified: number
  storageType: 'base64' | 'indexeddb' | 'reference'
  data?: string // base64 data
  originalPath?: string // for reference storage
  indexed_id?: string // for indexeddb storage
}

interface AudioStorageOptions {
  maxSizeForBase64: number // Max file size (in bytes) to store as base64
  preferredMethod: 'base64' | 'indexeddb' | 'reference'
}

export class AudioStorageService {
  private dbName = 'KaraokeAudioFiles'
  private dbVersion = 1
  private storeName = 'audioFiles'
  private db: IDBDatabase | null = null

  private options: AudioStorageOptions = {
    maxSizeForBase64: 1 * 1024 * 1024, // 1MB max for base64 (very safe)
    preferredMethod: 'indexeddb' // IndexedDB can handle 4-5MB files easily
  }

  constructor() {
    this.initIndexedDB()
  }

  private async initIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        console.warn('IndexedDB not supported by browser')
        resolve()
        return
      }

      const request = indexedDB.open(this.dbName, this.dbVersion)
      
      request.onerror = () => {
        console.warn('IndexedDB initialization failed, falling back to other storage methods')
        resolve()
      }
      
      request.onsuccess = () => {
        this.db = request.result
        console.log('IndexedDB initialized successfully - can handle large files!')
        resolve()
      }
      
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' })
          console.log('IndexedDB object store created')
        }
      }
    })
  }

  async storeAudioFile(file: File, projectId: string): Promise<StoredAudioFile> {
    const audioId = `${projectId}_${file.name}_${file.lastModified}`
    
    const fileSizeMB = file.size / 1024 / 1024
    console.log(`Storing audio file: ${file.name} (${fileSizeMB.toFixed(2)}MB)`)
    
    // Give user feedback for larger files
    if (fileSizeMB > 3) {
      console.log('Large file detected, using IndexedDB for optimal storage')
    }
    
    try {
      // Try methods in order of preference
      
      // 1. First try IndexedDB if available (best for larger files, no quota limits)
      if (this.db) {
        try {
          console.log('Attempting IndexedDB storage (unlimited capacity)...')
          return await this.storeInIndexedDB(file, audioId)
        } catch (indexedError) {
          console.warn('IndexedDB storage failed:', indexedError)
        }
      } else {
        console.warn('IndexedDB not available - this may cause issues with larger files')
      }
      
      // 2. Try base64 for smaller files
      if (file.size <= this.options.maxSizeForBase64) {
        try {
          console.log('Attempting base64 storage...')
          return await this.storeAsBase64(file, audioId)
        } catch (base64Error) {
          if (base64Error instanceof Error && base64Error.message === 'QUOTA_EXCEEDED') {
            console.warn('localStorage quota exceeded')
            // Show user-friendly message
            alert(`⚠️ Browser Storage Full!\n\nFile "${file.name}" couldn't be saved due to storage quota limits.\n\n✅ Your project will still work, but you'll need to re-select the audio file when loading.\n\n💡 Tip: Use the "Storage" button to clear old audio cache or try smaller audio files.`)
          } else {
            console.warn('Base64 storage failed:', base64Error)
          }
        }
      }
      
      // 3. Fallback to reference storage
      console.log('Using reference storage as fallback')
      return this.storeAsReference(file, audioId)
      
    } catch (error) {
      console.error('All storage methods failed:', error)
      // Final fallback to reference storage
      return this.storeAsReference(file, audioId)
    }
  }

  private async storeAsBase64(file: File, audioId: string): Promise<StoredAudioFile> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = () => {
        try {
          const base64Data = reader.result as string
          const stored: StoredAudioFile = {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
            storageType: 'base64',
            data: base64Data
          }
          
          // Try to store in localStorage with quota error handling
          const dataString = JSON.stringify(stored)
          
          // Check if we have enough space (rough estimate)
          const currentUsage = this.getLocalStorageUsage()
          const estimatedSize = dataString.length * 2 // UTF-16 encoding
          
          if (currentUsage + estimatedSize > 3 * 1024 * 1024) { // 3MB safe limit (very conservative)
            throw new Error('localStorage quota would be exceeded')
          }
          
          localStorage.setItem(`audio_${audioId}`, dataString)
          console.log('Audio file stored as base64:', file.name, `(${(file.size / 1024 / 1024).toFixed(2)}MB)`)
          resolve(stored)
          
        } catch (error) {
          if (error instanceof Error && (
            error.name === 'QuotaExceededError' || 
            error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
            error.message.includes('quota')
          )) {
            console.warn('localStorage quota exceeded, falling back to reference storage')
            reject(new Error('QUOTA_EXCEEDED'))
          } else {
            reject(error)
          }
        }
      }
      
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
  }

  private getLocalStorageUsage(): number {
    let total = 0
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length * 2 // UTF-16 encoding
      }
    }
    return total
  }

  private async storeInIndexedDB(file: File, audioId: string): Promise<StoredAudioFile> {
    if (!this.db) {
      throw new Error('IndexedDB database not initialized')
    }
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([this.storeName], 'readwrite')
        const store = transaction.objectStore(this.storeName)
        
        const audioData = {
          id: audioId,
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
          file: file
        }
        
        const request = store.put(audioData)
        
        request.onsuccess = () => {
          const stored: StoredAudioFile = {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
            storageType: 'indexeddb',
            indexed_id: audioId
          }
          console.log('✅ Audio file stored in IndexedDB:', file.name, `(${(file.size / 1024 / 1024).toFixed(2)}MB)`)
          resolve(stored)
        }
        
        request.onerror = () => {
          console.error('IndexedDB storage error:', request.error)
          reject(new Error(`IndexedDB storage failed: ${request.error?.message || 'Unknown error'}`))
        }
        
        transaction.onerror = () => {
          console.error('IndexedDB transaction error:', transaction.error)
          reject(new Error(`IndexedDB transaction failed: ${transaction.error?.message || 'Unknown error'}`))
        }
        
      } catch (error) {
        console.error('IndexedDB operation error:', error)
        reject(error)
      }
    })
  }

  private storeAsReference(file: File, audioId: string): StoredAudioFile {
    const stored: StoredAudioFile = {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      storageType: 'reference',
      originalPath: file.name // We can't get the full path for security reasons
    }
    
    console.log('Audio file stored as reference:', file.name)
    return stored
  }

  async retrieveAudioFile(storedFile: StoredAudioFile): Promise<AudioFile | null> {
    try {
      switch (storedFile.storageType) {
        case 'base64':
          return this.retrieveFromBase64(storedFile)
          
        case 'indexeddb':
          return await this.retrieveFromIndexedDB(storedFile)
          
        case 'reference':
          return await this.retrieveFromReference(storedFile)
          
        default:
          throw new Error(`Unknown storage type: ${storedFile.storageType}`)
      }
    } catch (error) {
      console.error('Error retrieving audio file:', error)
      return null
    }
  }

  private retrieveFromBase64(storedFile: StoredAudioFile): AudioFile {
    if (!storedFile.data) {
      throw new Error('No base64 data found')
    }
    
    // Convert base64 back to blob
    const byteCharacters = atob(storedFile.data.split(',')[1])
    const byteNumbers = new Array(byteCharacters.length)
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: storedFile.type })
    const file = new File([blob], storedFile.name, {
      type: storedFile.type,
      lastModified: storedFile.lastModified
    })
    
    return {
      name: storedFile.name,
      file: file,
      url: URL.createObjectURL(file)
    }
  }

  private async retrieveFromIndexedDB(storedFile: StoredAudioFile): Promise<AudioFile> {
    if (!this.db || !storedFile.indexed_id) {
      throw new Error('IndexedDB not available or no ID provided')
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.get(storedFile.indexed_id!)
      
      request.onsuccess = () => {
        const result = request.result
        if (result && result.file) {
          resolve({
            name: result.name,
            file: result.file,
            url: URL.createObjectURL(result.file)
          })
        } else {
          reject(new Error('Audio file not found in IndexedDB'))
        }
      }
      
      request.onerror = () => reject(request.error)
    })
  }

  private async retrieveFromReference(storedFile: StoredAudioFile): Promise<AudioFile> {
    // For reference storage, we need to prompt the user to re-select the file
    return new Promise((resolve, reject) => {
      const dialog = this.createFileSelectionDialog(storedFile)
      document.body.appendChild(dialog)
      
      const fileInput = dialog.querySelector('input[type="file"]') as HTMLInputElement
      const selectBtn = dialog.querySelector('.btn-primary') as HTMLButtonElement
      const cancelBtn = dialog.querySelector('.btn-secondary') as HTMLButtonElement
      
      selectBtn.addEventListener('click', () => {
        const selectedFile = fileInput.files?.[0]
        if (selectedFile) {
          // Verify it's likely the same file
          if (selectedFile.name === storedFile.name && 
              Math.abs(selectedFile.size - storedFile.size) < 1024) {
            resolve({
              name: selectedFile.name,
              file: selectedFile,
              url: URL.createObjectURL(selectedFile)
            })
          } else {
            const proceed = confirm(
              `The selected file (${selectedFile.name}, ${(selectedFile.size/1024/1024).toFixed(2)}MB) ` +
              `doesn't exactly match the original (${storedFile.name}, ${(storedFile.size/1024/1024).toFixed(2)}MB). ` +
              'Use it anyway?'
            )
            if (proceed) {
              resolve({
                name: selectedFile.name,
                file: selectedFile,
                url: URL.createObjectURL(selectedFile)
              })
            } else {
              reject(new Error('File selection cancelled'))
            }
          }
        } else {
          reject(new Error('No file selected'))
        }
        document.body.removeChild(dialog)
      })
      
      cancelBtn.addEventListener('click', () => {
        document.body.removeChild(dialog)
        reject(new Error('File selection cancelled'))
      })
    })
  }

  private createFileSelectionDialog(storedFile: StoredAudioFile): HTMLElement {
    const dialog = document.createElement('div')
    dialog.className = 'modal show'
    dialog.style.display = 'block'
    dialog.style.backgroundColor = 'rgba(0,0,0,0.5)'
    
    dialog.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">🎵 Locate Audio File</h5>
          </div>
          <div class="modal-body">
            <p><strong>Missing audio file:</strong></p>
            <div class="alert alert-info">
              <strong>File:</strong> ${storedFile.name}<br>
              <strong>Size:</strong> ${(storedFile.size / 1024 / 1024).toFixed(2)} MB<br>
              <strong>Type:</strong> ${storedFile.type}
            </div>
            <p>Please locate and select the original audio file to continue:</p>
            <input type="file" class="form-control" accept="audio/*">
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary">Cancel</button>
            <button type="button" class="btn btn-primary">Use Selected File</button>
          </div>
        </div>
      </div>
    `
    
    return dialog
  }

  async deleteAudioFile(storedFile: StoredAudioFile): Promise<void> {
    try {
      switch (storedFile.storageType) {
        case 'base64':
          // Remove from localStorage
          const keys = Object.keys(localStorage)
          for (const key of keys) {
            if (key.startsWith('audio_') && localStorage.getItem(key)?.includes(storedFile.name)) {
              localStorage.removeItem(key)
              break
            }
          }
          break
          
        case 'indexeddb':
          if (this.db && storedFile.indexed_id) {
            const transaction = this.db.transaction([this.storeName], 'readwrite')
            const store = transaction.objectStore(this.storeName)
            store.delete(storedFile.indexed_id)
          }
          break
          
        case 'reference':
          // Nothing to delete for references
          break
      }
      console.log('Audio file deleted:', storedFile.name)
    } catch (error) {
      console.error('Error deleting audio file:', error)
    }
  }

  getStorageInfo(): { method: string; sizeMB: number; count: number; quotaUsedMB: number; quotaLimitMB: number } {
    let sizeMB = 0
    let count = 0
    
    // Count base64 files in localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('audio_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}')
          if (data.size) {
            sizeMB += data.size / 1024 / 1024
            count++
          }
        } catch (e) {
          // Ignore invalid entries
        }
      }
    })
    
    const quotaUsedMB = this.getLocalStorageUsage() / 1024 / 1024
    const quotaLimitMB = this.db ? 1000 : 10 // IndexedDB ~1GB limit, localStorage ~10MB
    
    return {
      method: this.db ? 'indexeddb' : this.options.preferredMethod,
      sizeMB: Math.round(sizeMB * 100) / 100,
      count,
      quotaUsedMB: Math.round(quotaUsedMB * 100) / 100,
      quotaLimitMB
    }
  }

  async clearOldAudioFiles(): Promise<number> {
    let cleared = 0
    const keysToRemove: string[] = []
    
    // Find audio files in localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('audio_')) {
        keysToRemove.push(key)
      }
    })
    
    // Remove them
    keysToRemove.forEach(key => {
      localStorage.removeItem(key)
      cleared++
    })
    
    console.log(`Cleared ${cleared} audio files from localStorage`)
    return cleared
  }

  setStorageOptions(options: Partial<AudioStorageOptions>): void {
    this.options = { ...this.options, ...options }
    console.log('Audio storage options updated:', this.options)
  }

  // Diagnostic method to test IndexedDB functionality
  async testIndexedDBConnection(): Promise<{ available: boolean; error?: string; canStore: boolean }> {
    const result = { available: false, canStore: false, error: undefined as string | undefined }
    
    try {
      // Check if IndexedDB exists
      if (!window.indexedDB) {
        result.error = 'IndexedDB not supported by browser'
        return result
      }
      
      result.available = true
      
      // Test if we can actually open our database
      if (!this.db) {
        await this.initIndexedDB()
      }
      
      if (this.db) {
        result.canStore = true
        console.log('✅ IndexedDB connection test successful')
      } else {
        result.error = 'Could not initialize IndexedDB database'
      }
      
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown IndexedDB error'
    }
    
    return result
  }
}

// Export singleton instance
export const audioStorageService = new AudioStorageService()