import React, { Component } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

interface Props {
    onSpeechResult: (text: string) => void;
    isListening: boolean;
}

export default class SpeechRecognizer extends Component<Props> {
    webViewRef: WebView | null = null;

    html = `
    <!DOCTYPE html>
    <html>
    <body>
      <script>
        // Check for browser support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: 'Speech Recognition not supported in this WebView' }));
        } else {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';

          recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
              } else {
                interimTranscript += event.results[i][0].transcript;
              }
            }

            // Send most relevant text (final if available, else interim)
            // We want real-time feedback
            const text = finalTranscript || interimTranscript;
            if (text.trim()) {
                 window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'result', text: text.trim().toLowerCase() }));
            }
          };

          recognition.onerror = (event) => {
             window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: event.error }));
             // Auto-restart on some errors if desired
             if (event.error === 'no-speech' || event.error === 'network') {
                 // ignore or restart
             }
          };
          
          recognition.onend = () => {
             window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'end' }));
             // Keep alive loop
             setTimeout(() => {
                 try { recognition.start(); } catch(e) {}
             }, 1000);
          };

          // Expose start/stop to JS
          window.startRecognition = () => {
            try { recognition.start(); } catch(e) {}
          };
          
          window.stopRecognition = () => {
             try { recognition.stop(); } catch(e) {}
          };
          
          // Auto start
          try { recognition.start(); } catch(e) {}
        }
      </script>
    </body>
    </html>
  `;

    componentDidUpdate(prevProps: Props) {
        if (this.props.isListening !== prevProps.isListening) {
            if (this.props.isListening) {
                this.webViewRef?.injectJavaScript('window.startRecognition(); true;');
            } else {
                this.webViewRef?.injectJavaScript('window.stopRecognition(); true;');
            }
        }
    }

    handleMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'result') {
                this.props.onSpeechResult(data.text);
            } else if (data.type === 'error') {
                console.log("WebSpeech Error:", data.message);
            }
        } catch (e) {
            // console.error("Error parsing webview message", e);
        }
    }

    render() {
        return (
            <View style={styles.hidden}>
                <WebView
                    ref={(ref) => { this.webViewRef = ref; }}
                    originWhitelist={['*']}
                    source={{ html: this.html }}
                    onMessage={this.handleMessage}
                    javaScriptEnabled={true}
                    mediaPlaybackRequiresUserAction={false} // Important for audio on Android
                    allowsInlineMediaPlayback={true}
                />
            </View>
        );
    }
}

const styles = StyleSheet.create({
    hidden: {
        height: 0,
        width: 0,
        opacity: 0,
        position: 'absolute', // Ensure it doesn't take layout space
    }
});
