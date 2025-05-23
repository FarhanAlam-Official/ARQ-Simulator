# ARQ Protocol Simulator

An interactive educational tool for learning and visualizing Automatic Repeat reQuest (ARQ) protocols used in data link layer communications.

![ARQ Protocol Simulator Screenshot](screenshots/simulator-overview.png)

## 🌟 Features

- **Interactive Simulation**: Visualize how ARQ protocols handle frame transmission and error recovery
- **Multiple Protocols**: Supports Stop-and-Wait, Go-Back-N, and Selective Repeat ARQ
- **Customizable Parameters**: Adjust window size, error rate, simulation speed, and more
- **Step-by-Step Mode**: Walk through the simulation one step at a time for better understanding
- **Statistics**: Track performance metrics like efficiency, retransmissions, and frame losses
- **Export Data**: Save simulation results for further analysis
- **Responsive Design**: Works on desktop and mobile devices

## 🚀 Live Demo

Try the simulator online: [ARQ Protocol Simulator](https://farhanalaam-official.github.io/ARQ-Simulator/)

## 📚 Educational Purpose

This simulator was designed as a teaching tool for computer networking courses, specifically for understanding:

- How ARQ protocols ensure reliable data transmission over unreliable channels
- The trade-offs between different ARQ protocols
- The impact of window size and error rate on transmission efficiency
- The mechanics of sliding window protocols

## 🔍 Supported Protocols

### Stop-and-Wait ARQ

The simplest ARQ protocol where the sender transmits a single frame and waits for acknowledgment before sending the next frame.

### Go-Back-N ARQ

A sliding window protocol that allows multiple frames to be in transit, but requires the sender to retransmit all frames from the point of error when a frame is lost.

### Selective Repeat ARQ

The most efficient ARQ protocol that allows multiple frames to be in transit and only retransmits specific frames that were lost or damaged.

## 🛠️ Technical Implementation

- Pure JavaScript with no external dependencies
- CSS animations for visualizing frame transmission
- Responsive design using CSS Grid and Flexbox
- Event-driven simulation architecture

## 📋 Usage Instructions

1. Select an ARQ protocol (Stop-and-Wait, Go-Back-N, or Selective Repeat)
2. Adjust parameters like window size, error rate, and simulation speed
3. Click "Start" to begin the simulation or "Step" to advance one step at a time
4. Observe how frames are transmitted and acknowledged
5. View statistics to compare protocol efficiency
6. Export results for further analysis

## ⌨️ Keyboard Shortcuts

- **Space**: Start/Pause simulation
- **R**: Reset simulation
- **S**: Step through simulation
- **1**: Select Stop-and-Wait ARQ
- **2**: Select Go-Back-N ARQ
- **3**: Select Selective Repeat ARQ
- **+**: Increase simulation speed
- **-**: Decrease simulation speed

## 🧠 Learning Resources

- [Introduction to ARQ Protocols](https://en.wikipedia.org/wiki/Automatic_repeat_request)
- [Data Link Layer in OSI Model](https://en.wikipedia.org/wiki/Data_link_layer)
- [Sliding Window Protocols](https://en.wikipedia.org/wiki/Sliding_window_protocol)

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Contact

For questions or feedback, please open an issue on [GitHub](https://github.com/FarhanAlam-Official/ARQ-Simulator) or contact the maintainer at [Farhan Alam](https://github.com/FarhanAlam-Official).
