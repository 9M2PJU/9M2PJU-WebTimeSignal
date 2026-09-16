# 9M2PJU WebTimeSignal

> **Browser-based Low Frequency (LF) Time Signal Generator & JJY Radio Clock Transmitter**

WebTimeSignal is an open-source web application that transmits radio time signals directly from any modern web browser using standard headphones or audio cables. It enables radio-controlled clocks and watches (電波時計 / Wave Ceptor / Multi-Band timepieces) to synchronize accurately indoors or in regions outside normal terrestrial broadcast coverage.

---

## Table of Contents

1. [Overview & Operating Principle](#overview--operating-principle)
2. [Physics of Harmonic Transmission](#physics-of-harmonic-transmission)
3. [JJY Protocol & Frame Specification](#jjy-protocol--frame-specification)
4. [System Architecture & Signal Flow](#system-architecture--signal-flow)
5. [Usage Instructions](#usage-instructions)
6. [Hardware & Placement Recommendations](#hardware--placement-recommendations)
7. [Current Codebase Architecture](#current-codebase-architecture)
8. [Roadmap & Planned Enhancements](#roadmap--planned-enhancements)
9. [Safety & Hearing Protection](#safety--hearing-protection)
10. [License & Acknowledgments](#license--acknowledgments)

---

## Overview & Operating Principle

Terrestrial time signal stations broadcast standard time and frequency signals over longwave radio frequencies:
* **JJY (Japan)**: 40 kHz (Fukushima - Mount Otakadoya) and 60 kHz (Saga - Mount Hagane)
* **WWVB (USA)**: 60 kHz (Fort Collins, Colorado)
* **MSF (UK)**: 60 kHz (Anthorn, Cumbria)
* **DCF77 (Germany)**: 77.5 kHz (Mainflingen)
* **BPC (China)**: 68.5 kHz (Shangqiu, Henan)

Inside reinforced concrete buildings or outside the transmitter footprint, radio-controlled clocks cannot receive the broadcast signal. **WebTimeSignal** uses standard consumer audio hardware to generate an electromagnetic field that replicates the exact time signal encoding.

```
+------------------+       +-------------------+       +-----------------------+
|  Host Device     |  Web  |  Headphone Cable  |  EM   |  Radio-Controlled     |
|  (PC / Phone)    | Audio |  (Improvised      | Field |  Clock / Watch        |
|  WebTimeSignal   |======>|   Coil Antenna)   | ~~~~> |  (Ferrite Rod Antenna)|
+------------------+       +-------------------+       +-----------------------+
```

---

## Physics of Harmonic Transmission

Consumer audio digital-to-analog converters (DACs) operate at standard sampling rates of 44.1 kHz or 48 kHz, imposing a Nyquist frequency limit of 22.05 kHz or 24 kHz. As a result, standard audio outputs cannot directly synthesize a clean 40 kHz or 60 kHz sine wave fundamental.

To overcome this hardware limitation, WebTimeSignal exploits **odd harmonic radiation** from high-amplitude square waves.

### Mathematical Formulation

A square wave of fundamental frequency $f_0$ consists of an infinite series of odd harmonics:

$$\text{x}(t) = \frac{4}{\pi} \sum_{k=1,3,5,\dots}^{\infty} \frac{1}{k} \sin(2\pi k f_0 t) = \frac{4}{\pi} \left( \sin(2\pi f_0 t) + \frac{1}{3}\sin(6\pi f_0 t) + \frac{1}{5}\sin(10\pi f_0 t) + \dots \right)$$

For the **40 kHz JJY standard**:
* **Fundamental audio frequency ($f_0$)**: $13.333\text{ kHz}$
* **3rd Harmonic ($3 \times f_0$)**: $3 \times 13.333\text{ kHz} = 39.999\text{ kHz} \approx 40.000\text{ kHz}$

```mermaid
flowchart LR
    A["Web Audio Context<br/>Square Wave 13.333 kHz"] --> B["Audio DAC & Amplifier<br/>Volume 100% (High Slew Rate)"]
    B --> C["Earphone Lead / Coil<br/>Radiates 13.333 kHz + 39.999 kHz (3rd) + 66.665 kHz (5th)"]
    C --> D["Watch Bandpass Filter & Ferrite Antenna<br/>Tuned to 40.000 kHz"]
```

When audio output volume is set to maximum, current flowing through the voice coil and earphone cabling radiates magnetic flux. The internal tuned ferrite core antenna of the radio clock rejects the fundamental $13.333\text{ kHz}$ tone and captures the $40\text{ kHz}$ 3rd harmonic.

---

## JJY Protocol & Frame Specification

The JJY time code is broadcast in a continuous 60-second frame modulated with **Pulse Width Modulation (PWM)** at 1 pulse per second.

### Pulse Width Definitions

```mermaid
flowchart TD
    subgraph JJY_Modulation["JJY Pulse Width Modulation (1 Hz Symbol Rate)"]
        direction TB
        M["Marker (M / P0-P5)<br/>Duration: 200 ms Tone, 800 ms Silence<br/>Duty Cycle: 20%"]
        B1["Binary 1<br/>Duration: 500 ms Tone, 500 ms Silence<br/>Duty Cycle: 50%"]
        B0["Binary 0<br/>Duration: 800 ms Tone, 200 ms Silence<br/>Duty Cycle: 80%"]
    end
```

### 60-Second JJY Frame Structure

| Second | Field | Encoding / Description |
|:---:|:---|:---|
| **00** | **M** | Minute Reference Marker (200 ms pulse) |
| **01 – 08** | **Minute (00–59)** | BCD: 40, 20, 10 (tens) + 8, 4, 2, 1 (units) |
| **09** | **P1** | Position Marker 1 (200 ms pulse) |
| **10 – 18** | **Hour (00–23)** | BCD: 20, 10 (tens) + 8, 4, 2, 1 (units) |
| **19** | **P2** | Position Marker 2 (200 ms pulse) |
| **20 – 28** | **Day of Year (High/Mid)** | BCD Day count from Jan 1: 200, 100 + 80, 40, 20, 10 |
| **29** | **P3** | Position Marker 3 (200 ms pulse) |
| **30 – 33** | **Day of Year (Low)** | BCD Day count: 8, 4, 2, 1 |
| **34 – 35** | **Reserved** | Fixed to binary 0 (`00`) |
| **36** | **PA1** | Parity for Hour (even parity across hour bits) |
| **37** | **PA2** | Parity for Minute (even parity across minute bits) |
| **38** | **SU1** | Summer Time / Daylight Saving indicator 1 |
| **39** | **P4** | Position Marker 4 (200 ms pulse) |
| **40** | **SU2** | Summer Time / Daylight Saving indicator 2 |
| **41 – 48** | **Year (00–99)** | BCD: 80, 40, 20, 10 (tens) + 8, 4, 2, 1 (units) |
| **49** | **P5** | Position Marker 5 (200 ms pulse) |
| **50 – 52** | **Day of Week (0–6)** | Binary: Sunday=0, Monday=1, ..., Saturday=6 |
| **53 – 54** | **Leap Second (LS1, LS2)** | `00` = No leap second, `11` = Positive leap second (+1s) |
| **55 – 58** | **Reserved** | Fixed to binary 0 (`0000`) |
| **59** | **P0** | Position Marker 0 (200 ms pulse) |

---

## System Architecture & Signal Flow

### Transmission Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as Browser UI (index.html)
    participant Core as Scheduler (jjy.js)
    participant WebAudio as Web Audio API (AudioContext)
    participant Earphones as Earphone / Cable
    participant Clock as Radio Clock

    User->>UI: Connect earphones, wrap around clock, click "Start"
    UI->>Core: Initialize AudioContext & calculate next minute boundary
    Core->>Core: Encode Year, Day, Hour, Min, Parity into 60-bit frame
    loop Every Second of Frame
        Core->>WebAudio: Create OscillatorNode (13.333 kHz, square wave)
        Core->>WebAudio: Schedule start(t) and stop(t + duration)
        WebAudio->>Earphones: Audio output voltage waveform
        Earphones-->>Clock: 40 kHz electromagnetic 3rd harmonic
    end
    Clock->>Clock: Accumulate 2–3 full 60-second frames
    Clock->>Clock: Verify parity (PA1, PA2) and set internal quartz time
    User->>UI: Clock successfully synced, click "Stop"
    UI->>Core: Close AudioContext & cancel timer
```

### State Machine

```mermaid
stateDiagram-v2
    [*] --> Idle: Page Loaded

    Idle --> Initializing: User clicks "Start"
    Initializing --> SyncingToMinuteBoundary: AudioContext created, get current time
    SyncingToMinuteBoundary --> Transmitting: Next minute boundary reached

    state Transmitting {
        [*] --> SendMarker_M
        SendMarker_M --> SendMinuteData
        SendMinuteData --> SendHourData
        SendHourData --> SendDayOfYear
        SendDayOfYear --> SendParityAndFlags
        SendParityAndFlags --> SendYearAndDoW
        SendYearAndDoW --> SendLeapSeconds
        SendLeapSeconds --> SendMarker_P0
        SendMarker_P0 --> [*]
    }

    Transmitting --> Transmitting: Loop to next minute frame
    Transmitting --> Idle: User clicks "Stop"
```

---

## Usage Instructions

### Prerequisites
1. **Audio Device**: Computer, tablet, or smartphone with a 3.5mm headphone jack or USB-C / Lightning audio adapter.
2. **Earphones or Wire**: Standard wired earphones, headphones, or a 3.5mm aux cable.
3. **Radio Clock**: Any JJY-compatible radio-controlled timepiece (Citizen, Casio, Seiko, Rhythm, etc.).

### Step-by-Step Procedure

1. **Host Clock Accuracy**:
   Ensure the host computer or smartphone's clock is synchronized via NTP (Internet Time).
2. **Connect Earphones**:
   Plug your wired earphones into the device's audio jack.
3. **Wrap the Cable**:
   Wrap the earphone cable 2 to 4 times around the clock housing near its internal receiver antenna (usually located near the 12 o'clock position on wristwatches or along the top edge of desk clocks).
4. **Set Volume to Maximum**:
   Set the device master volume to **100%**.
5. **Start Transmission**:
   Click the **"Start"** button on the WebTimeSignal page. The canvas visualizer will illuminate green/yellow/red indicators for each transmitted second.
6. **Trigger Manual Reception on Clock**:
   Press and hold the manual receive button (usually labeled `REC`, `WAVE`, or `SET`) on your radio clock for 2–3 seconds until the sync icon blinks.
7. **Wait for Synchronization**:
   Keep the setup still for **2 to 5 minutes** (most clocks require 2 to 3 consecutive clean 60-second frames to validate time data). Once synchronized, click **"Stop"**.

---

## Hardware & Placement Recommendations

```
           +----------------------------------+
           |       Radio-Controlled Clock     |
           |      +--------------------+      |
           |      |   12:34:56  [RC]   |      |
           |      +--------------------+      |
           +----------------------------------+
             |    |     |    |     |    |
             |    |     |    |     |    |   <-- 2 to 4 loops of
             +----+-----+----+-----+----+       earphone cable
                  |                |
                  +--------+-------+
                           |
                     [3.5mm Jack]
                           |
                 +-------------------+
                 | Host Audio Output |
                 +-------------------+
```

* **Inductive Coupling**: Wrapping the earphone cord creates an air-core inductive coil. The magnetic field strength increases proportionally with the number of turns:
  $$B \propto N \cdot I$$
  where $N$ is the number of wire loops and $I$ is the audio output current.
* **Orientation**: Align the loops parallel to the internal ferrite bar inside the clock for maximum magnetic flux linkage.

---

## Current Codebase Architecture

* [`index.html`](file:///home/x/9M2PJU-WebTimeSignal/index.html): Responsive single-page interface with a 60-second frame Canvas visualizer and controls.
* [`jjy.js`](file:///home/x/9M2PJU-WebTimeSignal/jjy.js): Core signal generator:
  * [`AudioContext`](file:///home/x/9M2PJU-WebTimeSignal/jjy.js#L6) setup and 13.333 kHz square wave synthesis.
  * [`schedule()`](file:///home/x/9M2PJU-WebTimeSignal/jjy.js#L25-L176): 60-second BCD time frame builder, parity calculator, and Web Audio node scheduler.
  * [`render()`](file:///home/x/9M2PJU-WebTimeSignal/jjy.js#L239-L263): HTML5 Canvas real-time bit inspector rendering duty cycle bars.

---

## Roadmap & Planned Enhancements

| Feature | Description | Status |
|---|---|:---:|
| **JJY 60 kHz Support** | Support for Mount Hagane (Saga/Fukuoka) transmitter via 20 kHz (3rd) or 12 kHz (5th) harmonic | Planned |
| **WWVB / DCF77 / MSF / BPC** | Multi-protocol selector for US, European, UK, and Chinese radio clocks | Planned |
| **Stereo Anti-Phase Drive** | Drive Left channel at $+1$ and Right channel at $-1$ ($180^\circ$ phase inversion) to double peak-to-peak coil voltage | Planned |
| **Web NTP Synchronization** | Direct network time synchronization via HTTP/WebSocket to eliminate host clock drift | Planned |
| **Web Audio Lookahead Engine** | Continuous lookahead audio scheduling to prevent background tab throttling | Planned |
| **Progressive Web App (PWA)** | Offline support and service worker caching for field use | Planned |
| **Modern UI & i18n** | Multi-language interface (English, Malay, Japanese) with Dark mode support | Planned |

---

## Safety & Hearing Protection

> [!CAUTION]
> **DO NOT WEAR EARPHONES IN OR NEAR YOUR EARS WHILE RUNNING THIS APPLICATION.**
> 
> This tool outputs high-amplitude, high-frequency square waves ($13.333\text{ kHz}$) at maximum volume ($100\%$). Listening to this audio directly through headphones or earbuds can cause **permanent hearing damage, acoustic trauma, or severe discomfort**. Keep earphones placed near the clock, away from ears and pets.

---

## License & Acknowledgments

* Distributed under the **MIT License**. See [LICENSE.md](file:///home/x/9M2PJU-WebTimeSignal/LICENSE.md) for details.
* Maintained by [9M2PJU](https://github.com/9M2PJU).
* Based on the original implementation by [shogo82148/web-jjy](https://github.com/shogo82148/web-jjy).
