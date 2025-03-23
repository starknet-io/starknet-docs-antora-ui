/* eslint-disable no-undef */
console.log('Chatbot script loaded')

/* global WebSocket */

// Configuration
const CONFIG = {
  API_URL: 'https://backend.agent.starknet.id/api',
  WS_URL: 'wss://backend.agent.starknet.id/ws',
  MAX_RECONNECT_ATTEMPTS: 10,
  MAX_HISTORY_LENGTH: 10,
  HEARTBEAT_INTERVAL: 30000,
  RECONNECT_BASE_DELAY: 1000,
  MAX_RECONNECT_DELAY: 30000,
  HEARTBEAT_TIMEOUT: 5000,
}

// Add styles for the chat window
const style = document.createElement('style')
style.textContent = `
  #chat-window {
    position: fixed;
    bottom: 80px;
    right: 20px;
    width: 400px;
    height: 600px;
    background: #FFFFFF;
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    display: none;
    flex-direction: column;
    z-index: 1000;
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.3s ease, transform 0.3s ease;
  }

  #chat-window.visible {
    opacity: 1;
    transform: translateY(0);
  }

  #chat-header {
    padding: 10px;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  #connection-status {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  #connection-status.connected {
    background-color: #4CAF50;
  }

  #connection-status.disconnected {
    background-color: #f44336;
  }

  .chat-title {
    font-weight: bold;
    font-size: 14px;
  }

  .header-right {
    display: flex;
    gap: 8px;
  }

  .icon-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    color: var(--text);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon-button:hover {
    color: var(--links);
  }

  #chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 10px;
  }

  .message {
    margin-bottom: 10px;
    padding: 8px 12px;
    border-radius: 8px;
    max-width: 80%;
    font-size: 14px;
    line-height: 1.4;
    width: fit-content;
    overflow-x: auto;
    max-width: 90%;
  }

  .message .content {
    white-space: pre-wrap;
    word-break: break-word;
  }

  .message pre {
    font-size: 13px;
    margin: 8px 0;
    background: rgba(0, 0, 0, 0.05);
    padding: 8px;
    border-radius: 4px;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-word;
    max-width: 100%;
  }

  .message code {
    font-size: 13px;
    background: rgba(0, 0, 0, 0.05);
    padding: 2px 4px;
    border-radius: 3px;
    word-break: break-all;
  }

  .message.user {
    background: #0C0C4F;
    color: #FFFFFF;
    margin-left: auto;
  }

  .message.ai {
    background: #F5F5F5;
    color: #333333;
    margin-right: auto;
    border: 1px solid #E0E0E0;
  }

  .message.loading {
    background: #F5F5F5;
    color: #333333;
    margin-right: auto;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    opacity: 0.8;
    width: fit-content;
    border: 1px solid #E0E0E0;
  }

  .loading-dots {
    display: flex;
    gap: 4px;
  }

  .loading-dots span {
    width: 6px;
    height: 6px;
    background: currentColor;
    border-radius: 50%;
    animation: bounce 1.4s infinite ease-in-out both;
  }

  .loading-dots span:nth-child(1) { animation-delay: -0.32s; }
  .loading-dots span:nth-child(2) { animation-delay: -0.16s; }

  @keyframes bounce {
    0%, 80%, 100% { transform: scale(0); }
    40% { transform: scale(1); }
  }

  #chat-input {
    padding: 10px;
    border-top: 1px solid var(--border);
    display: flex;
    gap: 8px;
  }

  #message-input {
    flex: 1;
    padding: 8px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: #F5F5F5;
    color: #666666;
    font-size: 14px;
  }

  #message-input::placeholder {
    color: #999999;
  }

  #chat-toasts {
    position: fixed;
    bottom: 20px;
    left: 20px;
    z-index: 1001;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .chat-toast {
    padding: 10px;
    border-radius: 4px;
    color: #FFFFFF;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    animation: slideIn 0.3s ease-out;
    transition: opacity 0.5s ease;
  }

  .chat-toast.error {
    background: #f44336;
  }

  .chat-toast.warning {
    background: #ff9800;
  }

  @keyframes slideIn {
    from { transform: translateX(-100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
`.trim()
document.head.appendChild(style)

// Create and append the chat button
const chatButton = document.createElement('div')
chatButton.id = 'chat-button'
chatButton.innerHTML = '💬'
Object.assign(chatButton.style, {
  position: 'fixed',
  bottom: '20px',
  right: '20px',
  width: '50px',
  height: '50px',
  backgroundColor: '#E77787',
  color: '#FFFFFF',
  borderRadius: '50%',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  cursor: 'pointer',
  fontSize: '24px',
  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
  zIndex: '1000',
  transition: 'transform 0.3s ease',
})
document.body.appendChild(chatButton)

// Create and append the chat window
const chatWindow = document.createElement('div')
chatWindow.id = 'chat-window'
chatWindow.innerHTML = `
  <div id="chat-header">
    <div class="header-left">
      <div id="connection-status" class="disconnected" title="Disconnected from server"></div>
      <span class="chat-title">Starknet Assistant</span>
    </div>
    <div class="header-right">
      <button id="clear-history" class="icon-button" title="Clear History">
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path fill="currentColor" d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
        </svg>
      </button>
      <button id="close-chat" class="icon-button" title="Close Chat">
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
        </svg>
      </button>
    </div>
  </div>
  <div id="chat-messages"></div>
  <div id="chat-input">
    <input type="text" id="message-input" placeholder="Ask anything about Starknet...">
    <button id="send-message" class="icon-button" title="Send Message">
      <svg viewBox="0 0 24 24" width="20" height="20">
        <path fill="currentColor" d="M2,21L23,12L2,3V10L17,12L2,14V21Z" />
      </svg>
    </button>
  </div>
  <div id="chat-toasts"></div>
`.trim()
document.body.appendChild(chatWindow)

// Create a breadcrumb container for error messages
const breadcrumbContainer = document.createElement('div')
breadcrumbContainer.id = 'breadcrumb-container'
breadcrumbContainer.style.position = 'fixed'
breadcrumbContainer.style.bottom = '20px'
breadcrumbContainer.style.left = '20px'
breadcrumbContainer.style.zIndex = '1001'
breadcrumbContainer.style.display = 'flex'
breadcrumbContainer.style.flexDirection = 'column'
document.body.appendChild(breadcrumbContainer)

// ChatManager class implementation
class ChatManager {
  constructor () {
    this.state = {
      chatSocket: null,
      chatId: this.generateUniqueId(),
      reconnectAttempts: 0,
      currentMessageId: null,
      currentSources: [],
      currentMessageContent: '',
      messageHistory: [],
      isConnecting: false,
      lastHeartbeat: null,
      heartbeatTimeout: null,
      connectionQuality: 'good',
    }

    this.initializeDOMElements()
    this.attachEventListeners()
    this.loadChatHistory()
    this.initializeChat()
  }

  initializeDOMElements () {
    this.elements = {
      chatButton: document.getElementById('chat-button'),
      chatWindow: document.getElementById('chat-window'),
      messageInput: document.getElementById('message-input'),
      sendButton: document.getElementById('send-message'),
      closeButton: document.getElementById('close-chat'),
      clearButton: document.getElementById('clear-history'),
      messagesContainer: document.getElementById('chat-messages'),
      connectionStatus: document.getElementById('connection-status'),
    }
  }

  attachEventListeners () {
    this.elements.chatButton.addEventListener('click', () =>
      this.toggleChatWindow()
    )
    this.elements.closeButton.addEventListener('click', () =>
      this.closeChatWindow()
    )
    this.elements.sendButton.addEventListener('click', () => this.sendMessage())
    this.elements.messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendMessage()
    })
    this.elements.clearButton.addEventListener('click', () =>
      this.clearChatHistory()
    )
  }

  async initializeChat () {
    try {
      await this.fetchModels()
      this.connectWebSocket()
    } catch (error) {
      console.error('Error initializing chat:', error)
      throw new Error('Failed to initialize chat. Please try again later.')
    }
  }

  async fetchModels () {
    try {
      const response = await fetch(`${CONFIG.API_URL}/models`)
      return await response.json()
    } catch (error) {
      console.error('Error fetching models:', error)
      throw new Error('Failed to fetch models. Please try again later.')
    }
  }

  connectWebSocket () {
    if (this.state.isConnecting) return

    const wsURL = new URL(CONFIG.WS_URL)
    wsURL.search = new URLSearchParams(CONFIG.WS_PARAMS).toString()
    try {
      this.state.isConnecting = true
      this.state.chatSocket = new WebSocket(wsURL.toString())
      this.setupWebSocketHandlers()
      this.setupHeartbeat()
    } catch (error) {
      console.error('Error creating WebSocket:', error)
      this.handleWebSocketError(error)
      this.state.isConnecting = false
    }
  }

  setupWebSocketHandlers () {
    const ws = this.state.chatSocket
    ws.onopen = () => {
      console.log('WebSocket connection opened successfully')
      this.handleWebSocketOpen()
      this.state.isConnecting = false
      this.state.connectionQuality = 'good'
      this.state.lastHeartbeat = Date.now()
    }
    ws.onclose = (event) => {
      console.log('WebSocket connection closed:', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
        timestamp: new Date().toISOString(),
      })
      this.handleWebSocketClose(event)
      this.state.isConnecting = false
    }
    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      this.handleWebSocketError(error)
      this.state.isConnecting = false
    }
    ws.onmessage = (event) => {
      try {
        this.handleWebSocketMessage(event)
        this.updateConnectionQuality()
      } catch (error) {
        console.error('Error processing message:', error)
        this.handleErrorMessage({ data: 'Error processing message' })
      }
    }
  }

  setupHeartbeat () {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.state.chatSocket?.readyState === WebSocket.OPEN) {
        try {
          const heartbeatMessage = { type: 'ping', timestamp: Date.now() }
          this.state.chatSocket.send(JSON.stringify(heartbeatMessage))
          this.state.lastHeartbeat = Date.now()
          // Set up heartbeat timeout
          if (this.state.heartbeatTimeout) {
            clearTimeout(this.state.heartbeatTimeout)
          }
          this.state.heartbeatTimeout = setTimeout(() => {
            this.handleHeartbeatTimeout()
          }, CONFIG.HEARTBEAT_TIMEOUT)
        } catch (error) {
          console.error('Error sending heartbeat:', error)
          this.handleWebSocketError(error)
        }
      }
    }, CONFIG.HEARTBEAT_INTERVAL)
  }

  handleHeartbeatTimeout () {
    console.warn('Heartbeat timeout - connection might be unstable')
    this.state.connectionQuality = 'poor'
    this.updateConnectionStatus()
    if (this.state.chatSocket?.readyState === WebSocket.OPEN) {
      this.state.chatSocket.close()
    }
  }

  updateConnectionQuality () {
    if (this.state.lastHeartbeat) {
      const latency = Date.now() - this.state.lastHeartbeat
      if (latency > CONFIG.HEARTBEAT_TIMEOUT) {
        this.state.connectionQuality = 'poor'
      } else if (latency > CONFIG.HEARTBEAT_TIMEOUT / 2) {
        this.state.connectionQuality = 'fair'
      } else {
        this.state.connectionQuality = 'good'
      }
      this.updateConnectionStatus()
    }
  }

  updateConnectionStatus () {
    const statusElement = this.elements.connectionStatus
    if (!statusElement) return

    switch (this.state.connectionQuality) {
      case 'good':
        statusElement.className = 'connected'
        statusElement.title = 'Connected to server (Good connection)'
        break
      case 'fair':
        statusElement.className = 'connected fair'
        statusElement.title = 'Connected to server (Fair connection)'
        break
      case 'poor':
        statusElement.className = 'connected poor'
        statusElement.title = 'Connected to server (Poor connection)'
        break
      default:
        statusElement.className = 'disconnected'
        statusElement.title = 'Disconnected from server'
    }
  }

  handleWebSocketMessage (event) {
    try {
      const data = JSON.parse(event.data)
      // Validate message format
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid message format: message must be an object')
      }
      if (!data.type) {
        throw new Error('Invalid message format: message must have a type')
      }

      const handlers = {
        error: () => this.handleErrorMessage(data),
        sources: () => this.handleSourcesMessage(data),
        message: () => this.handleContentMessage(data),
        messageEnd: () => this.handleMessageEnd(),
        pong: () => {
          this.state.lastHeartbeat = Date.now()
          this.updateConnectionQuality()
        },
      }

      const handler = handlers[data.type]
      if (handler) {
        handler()
      } else {
        console.warn('Unknown message type:', data.type)
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error)
      this.handleErrorMessage({ data: 'Error processing message' })
    }
  }

  handleErrorMessage (data) {
    console.error('Received error message:', data.data)
    this.removeLoadingIndicator()
    throw new Error(data.data)
  }

  handleSourcesMessage (data) {
    this.state.currentSources = data.data
    this.state.currentMessageId = data.messageId
  }

  handleContentMessage (data) {
    if (this.state.currentMessageId !== data.messageId) {
      this.state.currentMessageId = data.messageId
      this.state.currentMessageContent = ''
      this.appendStreamingMessage(this.state.currentMessageId)
    }
    this.state.currentMessageContent += data.data
    this.updateStreamingMessage(
      this.state.currentMessageId,
      this.state.currentMessageContent,
      this.state.currentSources
    )
  }

  handleMessageEnd () {
    this.removeLoadingIndicator()
    this.updateStreamingMessage(
      this.state.currentMessageId,
      this.state.currentMessageContent,
      this.state.currentSources
    )
    this.state.messageHistory.push(['ai', this.state.currentMessageContent])
    this.trimMessageHistory()
    this.saveChatHistory()
    this.resetCurrentMessageState()
  }

  sendMessage () {
    const message = this.elements.messageInput.value.trim()
    if (!message) return

    if (this.state.chatSocket?.readyState === WebSocket.OPEN) {
      this.elements.messageInput.value = ''
      this.sendMessageToServer(message)
      this.showLoadingIndicator()
    } else {
      throw new Error('Not connected to the chat server. Please try again later.')
    }
  }

  sendMessageToServer (message) {
    const messageId = this.generateUniqueId()
    const messageData = {
      type: 'message',
      message: {
        messageId,
        chatId: this.state.chatId,
        content: message,
      },
      copilot: false,
      focusMode: 'docChatMode',
      history: this.state.messageHistory,
    }

    this.state.chatSocket.send(JSON.stringify(messageData))
    this.state.messageHistory.push(['human', message])
    this.trimMessageHistory()
    this.appendMessage('user', message, messageId)
  }

  saveChatHistory () {
    localStorage.setItem(
      'chatHistory',
      JSON.stringify(this.state.messageHistory)
    )
    localStorage.setItem('chatId', this.state.chatId)
  }

  loadChatHistory () {
    const savedHistory = localStorage.getItem('chatHistory')
    const savedChatId = localStorage.getItem('chatId')

    if (savedHistory) {
      this.state.messageHistory = JSON.parse(savedHistory)
      this.state.chatId = savedChatId || this.generateUniqueId()

      this.elements.messagesContainer.innerHTML = ''
      this.state.messageHistory.forEach(([role, content]) => {
        this.appendMessage(role === 'human' ? 'user' : 'ai', content)
      })
    }
  }

  generateUniqueId () {
    return `${Date.now().toString(36)}${Math.random().toString(36).substr(2)}`
  }

  trimMessageHistory () {
    if (this.state.messageHistory.length > CONFIG.MAX_HISTORY_LENGTH) {
      this.state.messageHistory = this.state.messageHistory.slice(
        -CONFIG.MAX_HISTORY_LENGTH
      )
    }
  }

  resetCurrentMessageState () {
    this.state.currentSources = []
    this.state.currentMessageId = null
    this.state.currentMessageContent = ''
  }

  showLoadingIndicator () {
    const loadingElement = document.createElement('div')
    loadingElement.className = 'message loading'
    loadingElement.innerHTML = `
      Thinking
      <div class="loading-dots">
        <span></span><span></span><span></span>
      </div>
    `
    this.elements.messagesContainer.appendChild(loadingElement)
    this.scrollToBottom()
  }

  removeLoadingIndicator () {
    const loadingElement = document.querySelector('.message.loading')
    if (loadingElement) {
      loadingElement.remove()
    }
  }

  scrollToBottom () {
    this.elements.messagesContainer.scrollTop =
      this.elements.messagesContainer.scrollHeight
  }

  toggleChatWindow () {
    const isVisible = this.elements.chatWindow.style.display === 'flex'
    if (!isVisible) {
      this.elements.chatWindow.style.display = 'flex'
      // Trigger reflow
      this.elements.chatWindow.classList.add('visible')
      this.elements.chatButton.innerHTML = '❌'
    } else {
      this.elements.chatWindow.classList.remove('visible')
      this.elements.chatButton.innerHTML = '💬'
      setTimeout(() => {
        this.elements.chatWindow.style.display = 'none'
      }, 300)
    }
    document.body.classList.toggle('chat-open', !isVisible)
  }

  closeChatWindow () {
    this.elements.chatWindow.classList.remove('visible')
    this.elements.chatButton.innerHTML = '💬'
    setTimeout(() => {
      this.elements.chatWindow.style.display = 'none'
      document.body.classList.remove('chat-open')
      this.saveChatHistory()
    }, 300)
  }

  appendMessage (role, content, messageId = null) {
    const messageElement = document.createElement('div')
    messageElement.className = `message ${role}`
    if (messageId) {
      messageElement.id = `message-${messageId}`
    }

    const contentElement = document.createElement('div')
    contentElement.className = 'content'
    contentElement.innerHTML = this.processMarkdown(content)
    messageElement.appendChild(contentElement)

    this.elements.messagesContainer.appendChild(messageElement)
    this.scrollToBottom()
    this.saveChatHistory()
  }

  appendStreamingMessage (messageId) {
    const messageElement = document.createElement('div')
    messageElement.className = 'message ai streaming'
    messageElement.id = `message-${messageId}`

    const contentElement = document.createElement('div')
    contentElement.className = 'content'
    messageElement.appendChild(contentElement)

    this.elements.messagesContainer.appendChild(messageElement)
    this.scrollToBottom()

    return messageElement
  }

  updateStreamingMessage (messageId, content, sources) {
    let messageElement = document.getElementById(`message-${messageId}`)
    if (!messageElement) {
      messageElement = this.appendStreamingMessage(messageId)
    }

    const contentElement = messageElement.querySelector('.content')
    if (contentElement) {
      const processedContent = this.processMarkdown(content, sources)
      contentElement.innerHTML = processedContent
      this.highlightCodeBlocks()
      this.scrollToBottom()
    }
  }

  highlightCodeBlocks () {
    if (window.Prism) {
      Prism.highlightAll()
    }
  }

  processMarkdown (content, sources = []) {
    let processedContent = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\[(\d+)\]/g, (match, p1) => {
        const sourceIndex = parseInt(p1) - 1
        return sources[sourceIndex]?.metadata?.url
          ? `<a href="${sources[sourceIndex].metadata.url}" target="_blank">[${p1}]</a>`
          : match
      })

    processedContent = processedContent.replace(
      /```(\w+)?\n([\s\S]*?)```/g,
      (_, language, code) =>
        `<pre><code class="language-${language || 'plaintext'}">${this.escapeHtml(code.trim())}</code></pre>`
    )

    if (sources.length > 0) {
      const formattedSources = sources
        .map(
          (source, i) =>
            `[${i + 1}] <a href="${source.metadata.url}" target="_blank">${source.metadata.title || 'Untitled'}</a>`
        )
        .join('\n')
      processedContent += `\n\nRelevant pages:\n${formattedSources}`
    }

    return processedContent
  }

  escapeHtml (unsafe) {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  handleWebSocketOpen () {
    console.log('WebSocket connection opened')
    this.setWSReady(true)
    this.state.reconnectAttempts = 0
    this.setupHeartbeat()
  }

  handleWebSocketClose (event) {
    console.log('WebSocket connection closed:', event)
    this.setWSReady(false)
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }
    if (this.state.heartbeatTimeout) {
      clearTimeout(this.state.heartbeatTimeout)
    }
    // Only attempt reconnect if it wasn't a clean closure
    if (event.code !== 1000 && event.code !== 1001) {
      this.attemptReconnect()
    }
  }

  handleWebSocketError (error) {
    console.error('WebSocket error:', error)
    if (this.state.chatSocket?.readyState === WebSocket.OPEN) {
      this.state.chatSocket.close()
    }
    this.showBreadcrumbError('WebSocket connection error occurred')
  }

  setWSReady (isReady) {
    this.elements.connectionStatus.className = isReady
      ? 'connected'
      : 'disconnected'
    this.elements.connectionStatus.title = isReady
      ? 'Connected to server'
      : 'Disconnected from server'
  }

  attemptReconnect () {
    this.state.reconnectAttempts++
    if (this.state.reconnectAttempts <= CONFIG.MAX_RECONNECT_ATTEMPTS) {
      const delay = Math.min(
        CONFIG.RECONNECT_BASE_DELAY * Math.pow(2, this.state.reconnectAttempts - 1),
        CONFIG.MAX_RECONNECT_DELAY
      )
      const jitter = Math.random() * 1000
      const totalDelay = delay + jitter

      console.log(`Reconnect attempt ${this.state.reconnectAttempts} in ${Math.round(totalDelay)}ms`)
      setTimeout(() => this.connectWebSocket(), totalDelay)
    } else {
      console.error('Max reconnection attempts reached')
    }
  }

  clearChatHistory () {
    this.state.messageHistory = []
    this.elements.messagesContainer.innerHTML = ''
    this.state.chatId = this.generateUniqueId()
  }

  showToast (message, type) {
    const toastContainer = document.getElementById('chat-toasts')
    if (!toastContainer) return

    const toast = document.createElement('div')
    toast.className = `chat-toast ${type}`
    toast.textContent = message
    toastContainer.appendChild(toast)

    // Automatically remove the toast after a few seconds
    setTimeout(() => {
      toast.style.opacity = '0'
      setTimeout(() => {
        toast.remove()
      }, 500) // Wait for the fade-out transition to complete
    }, 3000) // Display for 3 seconds
  }

  // New method to show breadcrumb error messages
  showBreadcrumbError (message) {
    const errorElement = document.createElement('div')
    errorElement.className = 'breadcrumb-error'
    errorElement.textContent = message
    errorElement.style.backgroundColor = '#f44336' // Red background for errors
    errorElement.style.color = '#FFFFFF' // White text
    errorElement.style.padding = '10px'
    errorElement.style.borderRadius = '4px'
    errorElement.style.marginBottom = '5px'
    errorElement.style.transition = 'opacity 0.5s ease'
    breadcrumbContainer.appendChild(errorElement)

    // Automatically remove the error message after a few seconds
    setTimeout(() => {
      errorElement.style.opacity = '0'
      setTimeout(() => {
        errorElement.remove()
      }, 500) // Wait for the fade-out transition to complete
    }, 3000) // Display for 3 seconds
  }
}

// Initialize the chat when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.chatManager = new ChatManager()
})

// Save chat history before unload
window.addEventListener('beforeunload', () => {
  if (window.chatManager) {
    window.chatManager.saveChatHistory()
  }
})
