// Constants
const FRAME_STATES = {
    READY: 'ready',
    SENT: 'sent',
    ACKED: 'acked',
    LOST: 'lost',
    TIMEOUT: 'timeout',
    RETRANSMITTED: 'retransmitted',
    BUFFERED: 'buffered'
};

const PROTOCOLS = {
    STOP_AND_WAIT: 'stop-and-wait',
    GO_BACK_N: 'go-back-n',
    SELECTIVE_REPEAT: 'selective-repeat'
};

// Simulation parameters
const simulationParams = {
    protocol: PROTOCOLS.STOP_AND_WAIT,
    windowSize: 3,
    errorRate: 20,
    speed: 2,
    totalFrames: 10,
    isRunning: false,
    isPaused: false,
    isStepMode: false,
    currentStep: 0,
    currentFrame: 0,
    baseWindow: 0,
    nextSeqNum: 0,
    timeUnits: 0,
    pendingEvents: [],
    maxRetransmissions: 3,
    frameRetransmissionCount: {},
    currentSeqNum: 0,
    // New parameters for Selective Repeat
    seqNumBits: 3,  // 3 bits for sequence numbers (0-7)
    receiverBuffer: {},  // Buffer for out-of-order frames
    receiverExpectedFrame: 0,  // Next frame expected by receiver
    senderWindow: new Set(),  // Track frames in sender's window
    stats: {
        framesSent: 0,
        framesLost: 0,
        acksLost: 0,
        retransmissions: 0,
        efficiency: 0,
        maxRetransmissionsReached: 0
    }
};

// DOM Elements
const elements = {
    protocolBtns: {
        stopAndWait: document.getElementById('stop-and-wait'),
        goBackN: document.getElementById('go-back-n'),
        selectiveRepeat: document.getElementById('selective-repeat')
    },
    protocolDescs: {
        stopAndWait: document.getElementById('stop-and-wait-desc'),
        goBackN: document.getElementById('go-back-n-desc'),
        selectiveRepeat: document.getElementById('selective-repeat-desc')
    },
    windowSizeInput: document.getElementById('window-size'),
    windowSizeValue: document.getElementById('window-size-value'),
    errorRateInput: document.getElementById('error-rate'),
    errorRateValue: document.getElementById('error-rate-value'),
    simulationSpeedInput: document.getElementById('simulation-speed'),
    simulationSpeedValue: document.getElementById('simulation-speed-value'),
    startBtn: document.getElementById('start-btn'),
    pauseBtn: document.getElementById('pause-btn'),
    stepBtn: document.getElementById('step-btn'),
    resetBtn: document.getElementById('reset-btn'),
    currentEvent: document.getElementById('current-event'),
    senderWindow: document.getElementById('sender-window'),
    receiverWindow: document.getElementById('receiver-window'),
    senderFrames: document.getElementById('sender-frames'),
    network: document.getElementById('network'),
    receiverFrames: document.getElementById('receiver-frames'),
    explanation: document.getElementById('explanation'),
    stats: {
        framesSent: document.getElementById('frames-sent'),
        framesLost: document.getElementById('frames-lost'),
        acksLost: document.getElementById('acks-lost'),
        retransmissions: document.getElementById('retransmissions'),
        efficiency: document.getElementById('efficiency'),
        timeUnits: document.getElementById('time-units'),
        maxRetries: document.getElementById('max-retries')
    },
    maxRetransmissionsInput: document.getElementById('max-retransmissions'),
    maxRetransmissionsValue: document.getElementById('max-retransmissions-value'),
    exportStatsBtn: document.getElementById('export-stats'),
    showShortcutsBtn: document.getElementById('show-shortcuts'),
    shortcutsModal: document.getElementById('shortcuts-modal'),
    closeModalBtn: document.querySelector('.close')
};

// Event Listeners
elements.protocolBtns.stopAndWait.addEventListener('click', () => selectProtocol(PROTOCOLS.STOP_AND_WAIT));
elements.protocolBtns.goBackN.addEventListener('click', () => selectProtocol(PROTOCOLS.GO_BACK_N));
elements.protocolBtns.selectiveRepeat.addEventListener('click', () => selectProtocol(PROTOCOLS.SELECTIVE_REPEAT));

elements.windowSizeInput.addEventListener('input', handleWindowSizeChange);
elements.errorRateInput.addEventListener('input', handleErrorRateChange);
elements.simulationSpeedInput.addEventListener('input', handleSimulationSpeedChange);

elements.startBtn.addEventListener('click', startSimulation);
elements.pauseBtn.addEventListener('click', pauseSimulation);
elements.stepBtn.addEventListener('click', stepSimulation);
elements.resetBtn.addEventListener('click', resetSimulation);

elements.maxRetransmissionsInput.addEventListener('input', handleMaxRetransmissionsChange);
elements.exportStatsBtn.addEventListener('click', exportStats);
elements.showShortcutsBtn.addEventListener('click', showShortcutsModal);
elements.closeModalBtn.addEventListener('click', hideShortcutsModal);

window.addEventListener('click', (e) => {
    if (e.target === elements.shortcutsModal) {
        hideShortcutsModal();
    }
});

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return; // Ignore when typing in input fields
    
    switch (e.key.toLowerCase()) {
        case ' ':
            e.preventDefault();
            if (!simulationParams.isRunning) {
                startSimulation();
            } else {
                pauseSimulation();
            }
            break;
        case 'r':
            resetSimulation();
            break;
        case 's':
            if (!simulationParams.isRunning) {
                stepSimulation();
            }
            break;
        case '1':
            selectProtocol(PROTOCOLS.STOP_AND_WAIT);
            break;
        case '2':
            selectProtocol(PROTOCOLS.GO_BACK_N);
            break;
        case '3':
            selectProtocol(PROTOCOLS.SELECTIVE_REPEAT);
            break;
        case '+':
        case '=':
            if (simulationParams.speed < 5) {
                elements.simulationSpeedInput.value = ++simulationParams.speed;
                handleSimulationSpeedChange();
            }
            break;
        case '-':
            if (simulationParams.speed > 1) {
                elements.simulationSpeedInput.value = --simulationParams.speed;
                handleSimulationSpeedChange();
            }
            break;
    }
});

// Initialize the simulation
function init() {
    selectProtocol(PROTOCOLS.STOP_AND_WAIT);
    handleErrorRateChange();
    handleSimulationSpeedChange();
    createFrames();
    updateStats();
    updateCurrentEvent('Select a protocol and press Start to begin the simulation.');
}

// Select a protocol
function selectProtocol(protocol) {
    simulationParams.protocol = protocol;
    
    // Update protocol buttons
    Object.values(elements.protocolBtns).forEach(btn => btn.classList.remove('active'));
    Object.values(elements.protocolDescs).forEach(desc => desc.classList.remove('active'));
    
    switch (protocol) {
        case PROTOCOLS.STOP_AND_WAIT:
            elements.protocolBtns.stopAndWait.classList.add('active');
            elements.protocolDescs.stopAndWait.classList.add('active');
            elements.windowSizeInput.disabled = true;
            simulationParams.windowSize = 1;
            elements.windowSizeInput.value = 1;
            elements.windowSizeValue.textContent = '1';
            updateExplanation(getStopAndWaitExplanation());
            break;
        case PROTOCOLS.GO_BACK_N:
            elements.protocolBtns.goBackN.classList.add('active');
            elements.protocolDescs.goBackN.classList.add('active');
            elements.windowSizeInput.disabled = false;
            simulationParams.windowSize = parseInt(elements.windowSizeInput.value);
            elements.windowSizeValue.textContent = simulationParams.windowSize;
            updateExplanation(getGoBackNExplanation());
            break;
        case PROTOCOLS.SELECTIVE_REPEAT:
            elements.protocolBtns.selectiveRepeat.classList.add('active');
            elements.protocolDescs.selectiveRepeat.classList.add('active');
            elements.windowSizeInput.disabled = false;
            simulationParams.windowSize = parseInt(elements.windowSizeInput.value);
            elements.windowSizeValue.textContent = simulationParams.windowSize;
            updateExplanation(getSelectiveRepeatExplanation());
            break;
    }
    
    resetSimulation();
    updateWindowIndicators();
}

// Create frames for the simulation
function createFrames() {
    elements.senderFrames.innerHTML = '';
    elements.receiverFrames.innerHTML = '';
    
    for (let i = 0; i < simulationParams.totalFrames; i++) {
        const seqNum = i % 2; // Alternate between 0 and 1
        
        const senderFrame = document.createElement('div');
        senderFrame.className = `frame ${FRAME_STATES.READY}`;
        senderFrame.id = `sender-frame-${i}`;
        senderFrame.innerHTML = `<span class="frame-num">${i}</span><span class="seq-num">${seqNum}</span>`;
        elements.senderFrames.appendChild(senderFrame);
        
        const receiverFrame = document.createElement('div');
        receiverFrame.className = `frame`;
        receiverFrame.id = `receiver-frame-${i}`;
        receiverFrame.innerHTML = `<span class="frame-num">${i}</span><span class="seq-num">${seqNum}</span>`;
        receiverFrame.style.visibility = 'hidden';
        elements.receiverFrames.appendChild(receiverFrame);
    }
    
    updateWindowIndicators();
}

// Update window indicators
function updateWindowIndicators() {
    if (simulationParams.protocol === PROTOCOLS.STOP_AND_WAIT) {
        elements.senderWindow.style.width = '0';
        elements.receiverWindow.style.width = '0';
        return;
    }
    
    const frameWidth = 60; // frame width + gap
    const windowWidth = simulationParams.windowSize * frameWidth;
    
    elements.senderWindow.style.width = `${windowWidth}px`;
    elements.senderWindow.style.left = `${simulationParams.baseWindow * frameWidth}px`;
    
    if (simulationParams.protocol === PROTOCOLS.SELECTIVE_REPEAT) {
        elements.receiverWindow.style.width = `${windowWidth}px`;
        elements.receiverWindow.style.left = `${simulationParams.baseWindow * frameWidth}px`;
    } else {
        elements.receiverWindow.style.width = '0';
    }
    
    // Update frame window indicators
    document.querySelectorAll('.frame').forEach(frame => {
        frame.classList.remove('in-window');
    });
    
    // Sender window
    for (let i = simulationParams.baseWindow; i < simulationParams.baseWindow + simulationParams.windowSize && i < simulationParams.totalFrames; i++) {
        const frame = document.getElementById(`sender-frame-${i}`);
        if (frame) {
            frame.classList.add('in-window');
        }
    }
    
    // Receiver window for Selective Repeat
    if (simulationParams.protocol === PROTOCOLS.SELECTIVE_REPEAT) {
        for (let i = simulationParams.baseWindow; i < simulationParams.baseWindow + simulationParams.windowSize && i < simulationParams.totalFrames; i++) {
            const frame = document.getElementById(`receiver-frame-${i}`);
            if (frame) {
                frame.classList.add('in-window');
            }
        }
    }
}

// Handle window size change
function handleWindowSizeChange() {
    simulationParams.windowSize = parseInt(elements.windowSizeInput.value);
    elements.windowSizeValue.textContent = simulationParams.windowSize;
    updateWindowIndicators();
}

// Handle error rate change
function handleErrorRateChange() {
    simulationParams.errorRate = parseInt(elements.errorRateInput.value);
    elements.errorRateValue.textContent = `${simulationParams.errorRate}%`;
}

// Handle simulation speed change
function handleSimulationSpeedChange() {
    simulationParams.speed = parseInt(elements.simulationSpeedInput.value);
    const speedLabels = ['Very Slow', 'Slow', 'Normal', 'Fast', 'Very Fast'];
    elements.simulationSpeedValue.textContent = speedLabels[simulationParams.speed - 1];
}

// Start the simulation
function startSimulation() {
    if (simulationParams.isPaused) {
        simulationParams.isPaused = false;
        updateCurrentEvent('Simulation resumed');
    } else {
        resetSimulation();
        simulationParams.isRunning = true;
        simulationParams.isStepMode = false;
        updateCurrentEvent('Simulation started');
    }
    
    elements.startBtn.disabled = true;
    elements.pauseBtn.disabled = false;
    elements.stepBtn.disabled = true;
    
    runSimulation();
}

// Pause the simulation
function pauseSimulation() {
    simulationParams.isPaused = true;
    elements.startBtn.disabled = false;
    elements.pauseBtn.disabled = true;
    elements.stepBtn.disabled = false;
    
    updateCurrentEvent('Simulation paused');
}

// Step through the simulation
function stepSimulation() {
    if (!simulationParams.isRunning) {
        resetSimulation();
        simulationParams.isRunning = true;
        simulationParams.isStepMode = true;
    }
    
    elements.startBtn.disabled = false;
    elements.pauseBtn.disabled = true;
    
    processNextStep();
}

// Reset the simulation
function resetSimulation() {
    simulationParams.isRunning = false;
    simulationParams.isPaused = false;
    simulationParams.isStepMode = false;
    simulationParams.currentStep = 0;
    simulationParams.currentFrame = 0;
    simulationParams.baseWindow = 0;
    simulationParams.nextSeqNum = 0;
    simulationParams.timeUnits = 0;
    simulationParams.pendingEvents = [];
    simulationParams.frameRetransmissionCount = {};
    simulationParams.currentSeqNum = 0;
    
    // Reset statistics
    simulationParams.stats = {
        framesSent: 0,
        framesLost: 0,
        acksLost: 0,
        retransmissions: 0,
        efficiency: 0,
        maxRetransmissionsReached: 0
    };
    
    // Reset UI
    elements.startBtn.disabled = false;
    elements.pauseBtn.disabled = true;
    elements.stepBtn.disabled = false;
    
    // Clear network area
    elements.network.innerHTML = '';
    
    // Reset frames
    createFrames();
    updateStats();
    
    updateCurrentEvent('Simulation reset');
}

// Run the simulation based on the selected protocol
function runSimulation() {
    if (!simulationParams.isRunning || simulationParams.isPaused) return;
    
    if (simulationParams.isStepMode) {
        return; // Wait for user to press Step button
    }
    
    processNextStep();
}

// Process the next step in the simulation
function processNextStep() {
    // If there are pending events, process them first
    if (simulationParams.pendingEvents.length > 0) {
        const event = simulationParams.pendingEvents.shift();
        event();
        
        if (!simulationParams.isStepMode) {
            setTimeout(runSimulation, getDelayTime());
        }
        return;
    }
    
    // Check if simulation is complete
    if (simulationParams.currentFrame >= simulationParams.totalFrames) {
        finishSimulation();
        return;
    }
    
    // Process next step based on protocol
    switch (simulationParams.protocol) {
        case PROTOCOLS.STOP_AND_WAIT:
            processStopAndWaitStep();
            break;
        case PROTOCOLS.GO_BACK_N:
            processGoBackNStep();
            break;
        case PROTOCOLS.SELECTIVE_REPEAT:
            processSelectiveRepeatStep();
            break;
    }
    
    // If not in step mode, schedule next step
    if (!simulationParams.isStepMode) {
        setTimeout(runSimulation, getDelayTime());
    }
}

// Process a step in Stop-and-Wait ARQ
function processStopAndWaitStep() {
    const frameIndex = simulationParams.currentFrame;
    const seqNum = simulationParams.currentSeqNum;
    
    // Initialize retransmission count for this frame if not exists
    if (!simulationParams.frameRetransmissionCount[frameIndex]) {
        simulationParams.frameRetransmissionCount[frameIndex] = 0;
    }
    
    // Check if max retransmissions reached
    if (simulationParams.frameRetransmissionCount[frameIndex] >= simulationParams.maxRetransmissions) {
        simulationParams.pendingEvents.push(() => {
            updateCurrentEvent(`Maximum retransmissions reached for Frame ${frameIndex} (Seq=${seqNum}). Moving to next frame.`);
            simulationParams.stats.maxRetransmissionsReached++;
            simulationParams.currentFrame++;
            simulationParams.currentSeqNum = (simulationParams.currentSeqNum + 1) % 2; // Toggle between 0 and 1
            updateStats();
        });
        return;
    }

    // Send the frame
    simulationParams.pendingEvents.push(() => {
        sendFrame(frameIndex, seqNum);
        updateCurrentEvent(`Sending Frame ${frameIndex} (Seq=${seqNum})`);
        simulationParams.timeUnits++;
        updateStats();
    });
    
    // Check if frame is lost
    const frameLost = isErrorOccurred();
    
    if (frameLost) {
        simulationParams.frameRetransmissionCount[frameIndex]++;
        
        // Frame lost
        simulationParams.pendingEvents.push(() => {
            markFrameLost(frameIndex);
            updateCurrentEvent(`Frame ${frameIndex} (Seq=${seqNum}) lost during transmission (Attempt ${simulationParams.frameRetransmissionCount[frameIndex]}/${simulationParams.maxRetransmissions})`);
            simulationParams.stats.framesLost++;
            updateStats();
        });
        
        // Timeout
        simulationParams.pendingEvents.push(() => {
            markFrameTimeout(frameIndex);
            updateCurrentEvent(`Timeout for Frame ${frameIndex} (Seq=${seqNum})`);
            simulationParams.timeUnits++;
            updateStats();
        });
        
        // Schedule retransmission after timeout
        setTimeout(() => {
            if (simulationParams.isRunning && !simulationParams.isPaused) {
                processStopAndWaitStep();
            }
        }, getDelayTime() * 2);
    } else {
        // Frame received
        simulationParams.pendingEvents.push(() => {
            receiveFrame(frameIndex, seqNum);
            updateCurrentEvent(`Frame ${frameIndex} (Seq=${seqNum}) received`);
        });
        
        // Check if ACK is lost
        const ackLost = isErrorOccurred();
        
        if (ackLost) {
            // ACK lost
            simulationParams.pendingEvents.push(() => {
                updateCurrentEvent(`ACK for Frame ${frameIndex} (Seq=${seqNum}) lost`);
                simulationParams.stats.acksLost++;
                updateStats();
            });
            
            // Timeout
            simulationParams.pendingEvents.push(() => {
                markFrameTimeout(frameIndex);
                updateCurrentEvent(`Timeout for Frame ${frameIndex} (Seq=${seqNum})`);
                simulationParams.timeUnits++;
                updateStats();
            });
            
            // Schedule retransmission after timeout
            setTimeout(() => {
                if (simulationParams.isRunning && !simulationParams.isPaused) {
                    processStopAndWaitStep();
                }
            }, getDelayTime() * 2);
        } else {
            // ACK received
            simulationParams.pendingEvents.push(() => {
                sendAck(frameIndex, seqNum);
                updateCurrentEvent(`ACK sent for Frame ${frameIndex} (Seq=${seqNum})`);
                simulationParams.timeUnits++;
                updateStats();
            });
            
            // Mark frame as ACKed and move to next frame
            simulationParams.pendingEvents.push(() => {
                markFrameAcked(frameIndex);
                updateCurrentEvent(`Frame ${frameIndex} (Seq=${seqNum}) acknowledged`);
                simulationParams.currentFrame++;
                simulationParams.currentSeqNum = (simulationParams.currentSeqNum + 1) % 2; // Toggle between 0 and 1
                updateStats();
            });
        }
    }
}

// Process a step in Go-Back-N ARQ
function processGoBackNStep() {
    // If all frames have been processed
    if (simulationParams.baseWindow >= simulationParams.totalFrames) {
        finishSimulation();
        return;
    }
    
    // If we can send more frames in the window
    if (simulationParams.nextSeqNum < simulationParams.baseWindow + simulationParams.windowSize && 
        simulationParams.nextSeqNum < simulationParams.totalFrames) {
        
        const frameIndex = simulationParams.nextSeqNum;
        const seqNum = frameIndex % simulationParams.windowSize;
        
        // Send the frame
        simulationParams.pendingEvents.push(() => {
            sendFrame(frameIndex, seqNum);
            updateCurrentEvent(`Sending Frame ${frameIndex} (Seq=${seqNum}) - Window: [${simulationParams.baseWindow}..${Math.min(simulationParams.baseWindow + simulationParams.windowSize - 1, simulationParams.totalFrames - 1)}]`);
            simulationParams.nextSeqNum++;
            simulationParams.timeUnits++;
            updateStats();
            updateWindowIndicators();
        });
        
        // Schedule next send if there are more frames in the window
        if (simulationParams.nextSeqNum < simulationParams.baseWindow + simulationParams.windowSize && 
            simulationParams.nextSeqNum < simulationParams.totalFrames) {
            simulationParams.pendingEvents.push(processGoBackNStep);
        } else {
            // Process ACKs for the window
            simulationParams.pendingEvents.push(processGoBackNAcks);
        }
    } else {
        // Process ACKs for the window
        simulationParams.pendingEvents.push(processGoBackNAcks);
    }
}

// Process ACKs for Go-Back-N
function processGoBackNAcks() {
    const frameIndex = simulationParams.baseWindow;
    const seqNum = frameIndex % simulationParams.windowSize;
    
    // Check if frame is lost
    const frameLost = isErrorOccurred();
    
    if (frameLost) {
        // Frame lost
        simulationParams.pendingEvents.push(() => {
            markFrameLost(frameIndex);
            updateCurrentEvent(`Frame ${frameIndex} (Seq=${seqNum}) lost during transmission`);
            simulationParams.stats.framesLost++;
            updateStats();
        });
        
        // Timeout
        simulationParams.pendingEvents.push(() => {
            markFrameTimeout(frameIndex);
            updateCurrentEvent(`Timeout for Frame ${frameIndex} (Seq=${seqNum})`);
            simulationParams.timeUnits++;
            updateStats();
        });
        
        // In Go-Back-N, retransmit ALL frames from the lost frame onwards
        simulationParams.pendingEvents.push(() => {
            const lastFrame = Math.min(simulationParams.nextSeqNum, simulationParams.totalFrames);
            updateCurrentEvent(`Go-Back-N: Retransmitting all frames from ${frameIndex} to ${lastFrame - 1}`);
            
            // Reset nextSeqNum to the lost frame
            simulationParams.nextSeqNum = frameIndex;
            
            // Mark all frames after the lost frame as needing retransmission
            for (let i = frameIndex; i < lastFrame; i++) {
                const frame = document.getElementById(`sender-frame-${i}`);
                if (frame) {
                    frame.className = `frame ${FRAME_STATES.RETRANSMITTED}`;
                }
            }
            
            simulationParams.timeUnits++;
            simulationParams.stats.retransmissions += (lastFrame - frameIndex);
            updateStats();
        });
        
        // Continue with the simulation
        simulationParams.pendingEvents.push(processGoBackNStep);
    } else {
        // Frame received
        simulationParams.pendingEvents.push(() => {
            receiveFrame(frameIndex, seqNum);
        });
        
        // Check if ACK is lost
        const ackLost = isErrorOccurred();
        
        if (ackLost) {
            // ACK lost
            simulationParams.pendingEvents.push(() => {
                updateCurrentEvent(`ACK for Frame ${frameIndex} (Seq=${seqNum}) lost`);
                simulationParams.stats.acksLost++;
                updateStats();
            });
            
            // Timeout and retransmit all frames
            simulationParams.pendingEvents.push(() => {
                markFrameTimeout(frameIndex);
                const lastFrame = Math.min(simulationParams.nextSeqNum, simulationParams.totalFrames);
                updateCurrentEvent(`Go-Back-N: Retransmitting all frames from ${frameIndex} to ${lastFrame - 1} due to lost ACK`);
                simulationParams.nextSeqNum = frameIndex;
                simulationParams.timeUnits++;
                simulationParams.stats.retransmissions += (lastFrame - frameIndex);
                updateStats();
            });
            
            // Continue with the simulation
            simulationParams.pendingEvents.push(processGoBackNStep);
        } else {
            // ACK received
            simulationParams.pendingEvents.push(() => {
                sendAck(frameIndex, seqNum);
                updateCurrentEvent(`ACK sent for Frame ${frameIndex} (Seq=${seqNum})`);
                simulationParams.timeUnits++;
                updateStats();
            });
            
            // Mark frame as ACKed and slide window
            simulationParams.pendingEvents.push(() => {
                markFrameAcked(frameIndex);
                simulationParams.baseWindow++;
                updateCurrentEvent(`Frame ${frameIndex} (Seq=${seqNum}) acknowledged, sliding window to ${simulationParams.baseWindow}`);
                updateWindowIndicators();
                updateStats();
            });
            
            // Continue with the simulation
            simulationParams.pendingEvents.push(processGoBackNStep);
        }
    }
}

// Process a step in Selective Repeat ARQ
function processSelectiveRepeatStep() {
    // Check if all frames have been acknowledged
    if (simulationParams.baseWindow >= simulationParams.totalFrames) {
        finishSimulation();
        return;
    }

    const maxSeqNum = Math.pow(2, simulationParams.seqNumBits);
    const effectiveWindowSize = Math.min(simulationParams.windowSize, Math.floor(maxSeqNum / 2));
    
    // Send any frames that fit in the window
    while (simulationParams.nextSeqNum < simulationParams.baseWindow + effectiveWindowSize && 
           simulationParams.nextSeqNum < simulationParams.totalFrames) {
        
        const frameIndex = simulationParams.nextSeqNum;
        const seqNum = frameIndex % maxSeqNum;

        // Add frame to sender's window
        simulationParams.senderWindow.add(frameIndex);

        // Schedule frame transmission
        simulationParams.pendingEvents.push(() => {
            sendFrame(frameIndex, seqNum);
            const windowEnd = Math.min(simulationParams.baseWindow + effectiveWindowSize - 1, simulationParams.totalFrames - 1);
            updateCurrentEvent(`Sending Frame ${frameIndex} (Seq=${seqNum}) - Window: [${simulationParams.baseWindow}..${windowEnd}]`);
            simulationParams.timeUnits++;
            updateStats();
            updateWindowIndicators();
            
            // Process frame transmission independently
            processSelectiveRepeatFrame(frameIndex, seqNum);
        });
        
        simulationParams.nextSeqNum++;
    }
    
    // If we've sent all frames in the window but haven't received all ACKs,
    // we need to wait for ACKs or timeouts
    if (simulationParams.pendingEvents.length === 0 && 
        simulationParams.senderWindow.size > 0) {
        // Just wait for ACKs or timeouts
        simulationParams.pendingEvents.push(() => {
            updateCurrentEvent(`Waiting for ACKs - Window: [${simulationParams.baseWindow}..${Math.min(simulationParams.baseWindow + effectiveWindowSize - 1, simulationParams.totalFrames - 1)}]`);
        });
    }
}

// Process a frame in Selective Repeat ARQ
function processSelectiveRepeatFrame(frameIndex, seqNum) {
    // Check if frame is lost
    const frameLost = isErrorOccurred();
    
    if (frameLost) {
        simulationParams.pendingEvents.push(() => {
            markFrameLost(frameIndex);
            updateCurrentEvent(`Frame ${frameIndex} (Seq=${seqNum}) lost during transmission`);
            simulationParams.stats.framesLost++;
            updateStats();
        });
        
        simulationParams.pendingEvents.push(() => {
            markFrameTimeout(frameIndex);
            updateCurrentEvent(`Timeout for Frame ${frameIndex} (Seq=${seqNum})`);
            simulationParams.timeUnits++;
            updateStats();
        });
        
        // Retransmit only this frame
        simulationParams.pendingEvents.push(() => {
            updateCurrentEvent(`Selective Repeat: Retransmitting Frame ${frameIndex} (Seq=${seqNum})`);
            retransmitFrame(frameIndex);
            simulationParams.timeUnits++;
            simulationParams.stats.retransmissions++;
            updateStats();
            
            processSelectiveRepeatFrame(frameIndex, seqNum);
        });
    } else {
        // Frame received successfully
        simulationParams.pendingEvents.push(() => {
            // Make sure the frame is visible on the receiver side
            receiveSelectiveRepeatFrame(frameIndex, seqNum);
            updateCurrentEvent(`Frame ${frameIndex} (Seq=${seqNum}) received by receiver`);
            
            // Send ACK
            const ackLost = isErrorOccurred();
            if (!ackLost) {
                sendAck(frameIndex, seqNum);
                updateCurrentEvent(`ACK sent for Frame ${frameIndex} (Seq=${seqNum})`);
                simulationParams.timeUnits++;
                
                // Process ACK
                processSelectiveRepeatAck(frameIndex, seqNum);
            } else {
                updateCurrentEvent(`ACK lost for Frame ${frameIndex} (Seq=${seqNum})`);
                simulationParams.stats.acksLost++;
                simulationParams.timeUnits++;
                
                // Schedule retransmission due to lost ACK
                simulationParams.pendingEvents.push(() => {
                    markFrameTimeout(frameIndex);
                    updateCurrentEvent(`Timeout for Frame ${frameIndex} (Seq=${seqNum})`);
                    retransmitFrame(frameIndex);
                    simulationParams.stats.retransmissions++;
                    processSelectiveRepeatFrame(frameIndex, seqNum);
                });
            }
            updateStats();
        });
    }
}

// Receive frame in Selective Repeat
function receiveSelectiveRepeatFrame(frameIndex, seqNum) {
    // If this is a duplicate frame, ignore it
    if (frameIndex < simulationParams.receiverExpectedFrame) {
        updateCurrentEvent(`Duplicate Frame ${frameIndex} (Seq=${seqNum}) received and discarded`);
        return;
    }
    
    // Buffer the frame
    simulationParams.receiverBuffer[frameIndex] = true;
    
    const receiverFrame = document.getElementById(`receiver-frame-${frameIndex}`);
    if (receiverFrame) {
        receiverFrame.style.visibility = 'visible';
        receiverFrame.className = `frame ${frameIndex === simulationParams.receiverExpectedFrame ? FRAME_STATES.ACKED : FRAME_STATES.BUFFERED}`;
    }
    
    // Try to deliver frames in order
    while (simulationParams.receiverBuffer[simulationParams.receiverExpectedFrame]) {
        const frame = document.getElementById(`receiver-frame-${simulationParams.receiverExpectedFrame}`);
        if (frame) {
            frame.className = `frame ${FRAME_STATES.ACKED}`;
        }
        
        delete simulationParams.receiverBuffer[simulationParams.receiverExpectedFrame];
        simulationParams.receiverExpectedFrame++;
        
        updateCurrentEvent(`Delivered Frame ${simulationParams.receiverExpectedFrame - 1} to network layer`);
    }
}

// Process ACK in Selective Repeat
function processSelectiveRepeatAck(frameIndex, seqNum) {
    // Remove frame from sender's window
    simulationParams.senderWindow.delete(frameIndex);
    
    // Mark frame as acknowledged
    markFrameAcked(frameIndex);
    
    // If the ACKed frame is at the base of the window, try to slide window
    if (frameIndex === simulationParams.baseWindow) {
        let newBase = simulationParams.baseWindow + 1;
        
        // Find the new base position (first unacknowledged frame)
        while (newBase < simulationParams.totalFrames) {
            const frame = document.getElementById(`sender-frame-${newBase}`);
            if (frame && !frame.classList.contains(FRAME_STATES.ACKED)) {
                break;
            }
            newBase++;
        }
        
        // If window has moved
        if (newBase > simulationParams.baseWindow) {
            const oldBase = simulationParams.baseWindow;
            simulationParams.baseWindow = newBase;
            
            updateCurrentEvent(`Sliding window from ${oldBase} to ${newBase}`);
            updateWindowIndicators();
            
            // IMMEDIATE TRANSMISSION: Send new frames right away without waiting for other ACKs
            const maxSeqNum = Math.pow(2, simulationParams.seqNumBits);
            const effectiveWindowSize = Math.min(simulationParams.windowSize, Math.floor(maxSeqNum / 2));
            
            // Calculate how many new frames we can send
            const newFramesEnd = Math.min(
                simulationParams.baseWindow + effectiveWindowSize,
                simulationParams.totalFrames
            );
            
            // Send each new frame that fits in the window immediately
            for (let i = simulationParams.nextSeqNum; i < newFramesEnd; i++) {
                const newFrameIndex = i;
                const newSeqNum = newFrameIndex % maxSeqNum;
                
                // Add to sender's window
                simulationParams.senderWindow.add(newFrameIndex);
                
                // Create and insert the frame transmission event at the BEGINNING of the queue
                // This ensures it happens before any other pending events
                simulationParams.pendingEvents.unshift(() => {
                    sendFrame(newFrameIndex, newSeqNum);
                    updateCurrentEvent(`IMMEDIATE: Sending Frame ${newFrameIndex} (Seq=${newSeqNum}) after window slide`);
                    simulationParams.timeUnits++;
                    simulationParams.nextSeqNum = Math.max(simulationParams.nextSeqNum, newFrameIndex + 1);
                    updateStats();
                    updateWindowIndicators();
                    
                    // Process this frame independently
                    processSelectiveRepeatFrame(newFrameIndex, newSeqNum);
                });
            }
        }
    }
}

// Send a frame
function sendFrame(frameIndex, seqNum) {
    const frame = document.getElementById(`sender-frame-${frameIndex}`);
    if (frame) {
        frame.className = `frame ${FRAME_STATES.SENT}`;
        
        // Only increment framesSent if this is not a retransmission
        if (!frame.classList.contains(FRAME_STATES.RETRANSMITTED)) {
            simulationParams.stats.framesSent++;
        }
        
        // Get sequence number based on protocol
        let sequenceNumber;
        if (simulationParams.protocol === PROTOCOLS.STOP_AND_WAIT) {
            sequenceNumber = simulationParams.currentSeqNum;
        } else {
            sequenceNumber = frameIndex % simulationParams.windowSize;
        }
        
        // Create animation for frame transmission
        createPacket(frameIndex, 'data', sequenceNumber, false);
    }
}

// Mark a frame as lost
function markFrameLost(frameIndex) {
    const frame = document.getElementById(`sender-frame-${frameIndex}`);
    if (frame) {
        frame.className = `frame ${FRAME_STATES.LOST}`;
        
        // Create animation for lost frame
        createPacket(frameIndex, 'data', simulationParams.currentSeqNum, true);
    }
}

// Mark a frame as timed out
function markFrameTimeout(frameIndex) {
    const frame = document.getElementById(`sender-frame-${frameIndex}`);
    if (frame) {
        frame.className = `frame ${FRAME_STATES.TIMEOUT}`;
    }
}

// Retransmit a frame
function retransmitFrame(frameIndex) {
    const frame = document.getElementById(`sender-frame-${frameIndex}`);
    if (frame) {
        frame.className = `frame ${FRAME_STATES.RETRANSMITTED}`;
        simulationParams.stats.retransmissions++;
        
        // For Go-Back-N, count all subsequent frames in window as retransmissions
        if (simulationParams.protocol === PROTOCOLS.GO_BACK_N) {
            const lastFrame = Math.min(simulationParams.nextSeqNum, simulationParams.totalFrames);
            simulationParams.stats.retransmissions += (lastFrame - frameIndex - 1);
        }
        
        // Create animation for frame retransmission
        createPacket(frameIndex, 'data');
    }
}

// Receive a frame (generic function)
function receiveFrame(frameIndex, seqNum) {
    const receiverFrame = document.getElementById(`receiver-frame-${frameIndex}`);
    if (receiverFrame) {
        receiverFrame.style.visibility = 'visible';
        
        // For Selective Repeat, use the specialized function
        if (simulationParams.protocol === PROTOCOLS.SELECTIVE_REPEAT) {
            // This is now handled by receiveSelectiveRepeatFrame
            return;
        }
        
        // For other protocols
        receiverFrame.className = `frame ${FRAME_STATES.ACKED}`;
    }
}

// Send an ACK
function sendAck(frameIndex, seqNum) {
    createPacket(frameIndex, 'ack', seqNum, false);
}

// Mark a frame as ACKed
function markFrameAcked(frameIndex) {
    const frame = document.getElementById(`sender-frame-${frameIndex}`);
    if (frame) {
        frame.className = `frame ${FRAME_STATES.ACKED}`;
    }
}

// Create a packet animation
function createPacket(frameIndex, type, seqNum, isLost = false) {
    const packet = document.createElement('div');
    packet.className = `packet ${type}`;
    packet.innerHTML = `
        <span class="frame-num">${frameIndex}</span>
        <span class="seq-num">${seqNum}</span>
    `;
    
    const network = elements.network;
    network.appendChild(packet);
    
    // Set initial position
    if (type === 'data') {
        // From sender to receiver
        packet.style.left = '0';
        packet.style.top = '50%';
        packet.style.transform = 'translate(0, -50%)';
        
        // Animate to receiver or get lost midway
        requestAnimationFrame(() => {
            if (isLost) {
                // Move to middle and fade out
                packet.style.left = '50%';
                packet.style.transform = 'translate(-50%, -50%)';
                packet.classList.add('lost');
                
                // Remove after animation
                setTimeout(() => {
                    packet.remove();
                }, 1000);
            } else {
                // Move to receiver
                packet.style.left = '100%';
                packet.style.transform = 'translate(-100%, -50%)';
                
                // Remove after reaching destination
                setTimeout(() => {
                    packet.remove();
                }, 1000);
            }
        });
    } else {
        // From receiver to sender (ACK)
        packet.style.left = '100%';
        packet.style.top = '50%';
        packet.style.transform = 'translate(-100%, -50%)';
        
        // Animate to sender or get lost midway
        requestAnimationFrame(() => {
            if (isLost) {
                // Move to middle and fade out
                packet.style.left = '50%';
                packet.style.transform = 'translate(-50%, -50%)';
                packet.classList.add('lost');
                
                // Remove after animation
                setTimeout(() => {
                    packet.remove();
                }, 1000);
            } else {
                // Move to sender
                packet.style.left = '0';
                packet.style.transform = 'translate(0, -50%)';
                
                // Remove after reaching destination
                setTimeout(() => {
                    packet.remove();
                }, 1000);
            }
        });
    }
}

// Check if an error occurs based on error rate
function isErrorOccurred() {
    return Math.random() * 100 < simulationParams.errorRate;
}

// Update statistics
function updateStats() {
    // Update basic stats
    elements.stats.framesSent.textContent = simulationParams.stats.framesSent;
    elements.stats.framesLost.textContent = simulationParams.stats.framesLost;
    elements.stats.acksLost.textContent = simulationParams.stats.acksLost;
    elements.stats.retransmissions.textContent = simulationParams.stats.retransmissions;
    elements.stats.maxRetries.textContent = simulationParams.stats.maxRetransmissionsReached;
    elements.stats.timeUnits.textContent = simulationParams.timeUnits;
    
    // Calculate efficiency based on protocol
    let efficiency = 0;
    if (simulationParams.stats.framesSent > 0) {
        switch (simulationParams.protocol) {
            case PROTOCOLS.STOP_AND_WAIT:
                // Efficiency = Successfully transmitted frames / Total frames sent
                efficiency = ((simulationParams.currentFrame - simulationParams.stats.maxRetransmissionsReached) / simulationParams.stats.framesSent) * 100;
                break;
                
            case PROTOCOLS.GO_BACK_N:
                // Efficiency = Successfully transmitted frames / (Total frames sent + Retransmitted frames)
                // In Go-Back-N, we count each retransmitted window as additional frames
                const totalTransmissions = simulationParams.stats.framesSent + simulationParams.stats.retransmissions;
                efficiency = (simulationParams.currentFrame / totalTransmissions) * 100;
                break;
                
            case PROTOCOLS.SELECTIVE_REPEAT:
                // Efficiency = Successfully transmitted frames / (Total frames sent + Individual retransmissions)
                // In Selective Repeat, we only count individually retransmitted frames
                const totalSelectiveTransmissions = simulationParams.stats.framesSent + simulationParams.stats.retransmissions;
                efficiency = (simulationParams.currentFrame / totalSelectiveTransmissions) * 100;
                break;
        }
    }
    
    elements.stats.efficiency.textContent = `${efficiency.toFixed(2)}%`;
    simulationParams.stats.efficiency = parseFloat(efficiency.toFixed(2));
}

// Update current event
function updateCurrentEvent(message) {
    elements.currentEvent.textContent = message;
    elements.currentEvent.classList.add('highlight');
    setTimeout(() => {
        elements.currentEvent.classList.remove('highlight');
    }, 500);
}

// Update explanation
function updateExplanation(explanation) {
    elements.explanation.innerHTML = explanation;
    elements.explanation.classList.add('fade-in');
    setTimeout(() => {
        elements.explanation.classList.remove('fade-in');
    }, 500);
}

// Get delay time based on simulation speed
function getDelayTime() {
    const baseDelay = 2000;
    return baseDelay / simulationParams.speed;
}

// Finish the simulation
function finishSimulation() {
    simulationParams.isRunning = false;
    elements.startBtn.disabled = false;
    elements.pauseBtn.disabled = true;
    elements.stepBtn.disabled = false;
    
    // Calculate final statistics
    const successfulFrames = simulationParams.currentFrame - simulationParams.stats.maxRetransmissionsReached;
    const totalTransmissions = simulationParams.stats.framesSent + simulationParams.stats.retransmissions;
    const finalEfficiency = (successfulFrames / totalTransmissions) * 100;
    
    updateCurrentEvent('Simulation completed');
    
    // Show final statistics
    const finalMessage = `
        <p><strong>Simulation Complete!</strong></p>
        <p>Protocol: ${getProtocolName()}</p>
        <p>Total Frames: ${simulationParams.totalFrames}</p>
        <p>Successful Frames: ${successfulFrames}</p>
        <p>Frames Sent: ${simulationParams.stats.framesSent}</p>
        <p>Frames Lost: ${simulationParams.stats.framesLost}</p>
        <p>ACKs Lost: ${simulationParams.stats.acksLost}</p>
        <p>Retransmissions: ${simulationParams.stats.retransmissions}</p>
        <p>Max Retries Hit: ${simulationParams.stats.maxRetransmissionsReached}</p>
        <p>Efficiency: ${finalEfficiency.toFixed(2)}%</p>
        <p>Time Units: ${simulationParams.timeUnits}</p>
    `;
    
    updateExplanation(finalMessage);
}

// Get protocol name
function getProtocolName() {
    switch (simulationParams.protocol) {
        case PROTOCOLS.STOP_AND_WAIT:
            return 'Stop-and-Wait ARQ';
        case PROTOCOLS.GO_BACK_N:
            return 'Go-Back-N ARQ';
        case PROTOCOLS.SELECTIVE_REPEAT:
            return 'Selective Repeat ARQ';
        default:
            return 'Unknown';
    }
}

// Get Stop-and-Wait explanation
function getStopAndWaitExplanation() {
    return `
        <p><strong>Stop-and-Wait ARQ</strong> is the simplest ARQ protocol:</p>
        <ol>
            <li>The sender sends <strong>one frame</strong> at a time.</li>
            <li>After sending a frame, the sender <strong>waits</strong> for an acknowledgment (ACK).</li>
            <li>If the ACK is received, the sender sends the <strong>next frame</strong>.</li>
            <li>If the ACK is not received within a timeout period, the sender <strong>retransmits</strong> the frame.</li>
        </ol>
        <p><strong>Key Characteristics:</strong></p>
        <ul>
            <li>Simple to implement</li>
            <li>Low efficiency, especially with high latency</li>
            <li>Sender utilization = 1 / (1 + 2a), where a = propagation time / transmission time</li>
        </ul>
    `;
}

// Get Go-Back-N explanation
function getGoBackNExplanation() {
    return `
        <p><strong>Go-Back-N ARQ</strong> improves efficiency by allowing multiple frames to be sent:</p>
        <ol>
            <li>The sender can transmit up to <strong>N frames</strong> (window size) without waiting for individual ACKs.</li>
            <li>The receiver only accepts frames <strong>in order</strong>.</li>
            <li>If a frame is lost or damaged, the receiver <strong>discards</strong> it and all subsequent frames.</li>
            <li>When a timeout occurs, the sender <strong>retransmits all frames</strong> starting from the lost one.</li>
        </ol>
        <p><strong>Key Characteristics:</strong></p>
        <ul>
            <li>Better efficiency than Stop-and-Wait</li>
            <li>Wastes bandwidth when retransmitting frames that were successfully received</li>
            <li>Receiver needs to maintain only one variable (expected sequence number)</li>
            <li>Optimal window size depends on bandwidth-delay product</li>
        </ul>
    `;
}

// Get Selective Repeat explanation
function getSelectiveRepeatExplanation() {
    return `
        <p><strong>Selective Repeat ARQ</strong> is the most efficient ARQ protocol:</p>
        <ol>
            <li>The sender can transmit up to <strong>N frames</strong> (window size) without waiting for individual ACKs.</li>
            <li>The receiver can accept frames <strong>out of order</strong> and buffer them.</li>
            <li>The receiver sends an ACK for <strong>each correctly received frame</strong>.</li>
            <li>The sender only <strong>retransmits specific frames</strong> that were lost or damaged.</li>
        </ol>
        <p><strong>Key Characteristics:</strong></p>
        <ul>
            <li>Most efficient use of bandwidth</li>
            <li>Only lost frames are retransmitted</li>
            <li>Requires more complex buffer management at both sender and receiver</li>
            <li>Window size must be ≤ half the sequence number space to avoid ambiguity</li>
            <li>Receiver must maintain a window to track which frames to accept</li>
        </ul>
        <p>This protocol is ideal for high-bandwidth, high-latency networks where retransmitting all frames would be costly.</p>
    `;
}

// Handle max retransmissions change
function handleMaxRetransmissionsChange() {
    simulationParams.maxRetransmissions = parseInt(elements.maxRetransmissionsInput.value);
    elements.maxRetransmissionsValue.textContent = simulationParams.maxRetransmissions;
}

// Show shortcuts modal
function showShortcutsModal() {
    elements.shortcutsModal.style.display = 'block';
}

// Hide shortcuts modal
function hideShortcutsModal() {
    elements.shortcutsModal.style.display = 'none';
}

// Export statistics to CSV
function exportStats() {
    const stats = simulationParams.stats;
    const protocol = getProtocolName();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    const successfulFrames = simulationParams.currentFrame - stats.maxRetransmissionsReached;
    const totalTransmissions = stats.framesSent + stats.retransmissions;
    const finalEfficiency = (successfulFrames / totalTransmissions) * 100;
    
    const csvContent = [
        'Protocol,Window Size,Error Rate,Simulation Speed,Max Retransmissions',
        `${protocol},${simulationParams.windowSize},${simulationParams.errorRate}%,${simulationParams.speed},${simulationParams.maxRetransmissions}`,
        '',
        'Metric,Value',
        `Total Frames,${simulationParams.totalFrames}`,
        `Successful Frames,${successfulFrames}`,
        `Frames Sent,${stats.framesSent}`,
        `Frames Lost,${stats.framesLost}`,
        `ACKs Lost,${stats.acksLost}`,
        `Retransmissions,${stats.retransmissions}`,
        `Max Retries Hit,${stats.maxRetransmissionsReached}`,
        `Efficiency,${finalEfficiency.toFixed(2)}%`,
        `Time Units,${simulationParams.timeUnits}`
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `arq-simulation-${protocol}-${timestamp}.csv`;
    link.click();
}

// Initialize the simulation when the page loads
window.addEventListener('load', init);





