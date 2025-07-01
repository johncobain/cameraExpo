import Icon from "@react-native-vector-icons/fontawesome";
import { useEffect, useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  StatusBar,
  TouchableOpacity,
  Modal,
  Image,
  Dimensions,
} from "react-native";
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useMicrophonePermission,
} from "react-native-vision-camera";

import { VideoView, useVideoPlayer } from "expo-video";
import * as MediaLibrary from "expo-media-library";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

export default function App() {
  const [cameraPosition, setCameraPosition] = useState<"front" | "back">(
    "back"
  );
  const device = useCameraDevice(cameraPosition);
  const { hasPermission, requestPermission } = useCameraPermission();
  const {
    hasPermission: hasMicPermission,
    requestPermission: requestMicPermission,
  } = useMicrophonePermission();

  const [permission, setPermission] = useState<null | boolean>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const cameraRef = useRef<Camera>(null);

  // Create video player for expo-video
  const player = useVideoPlayer(videoUri || "");

  useEffect(() => {
    if (player && videoUri) {
      player.replace(videoUri);
      player.loop = true;
      player.play();
    }
  }, [videoUri, player]);

  useEffect(() => {
    (async () => {
      const status = await requestPermission();
      const statusMic = await requestMicPermission();

      if (status && statusMic) {
        setPermission(true);
      }

      const { status: mediaLibraryStatus } =
        await MediaLibrary.requestPermissionsAsync();

      if (mediaLibraryStatus !== "granted") {
        console.log("Access to media library is denied");
        setPermission(false);
        return;
      }
    })();
  }, []);

  const startRecording = () => {
    if (!cameraRef.current || !device) return;

    // Clear any existing state before starting new recording
    setVideoUri(null);
    setPhotoUri(null);
    setModalVisible(false);
    setIsRecording(true);

    cameraRef.current.startRecording({
      onRecordingFinished: (video) => {
        setIsRecording(false);
        console.log("Video recorded:", video.path);
        console.log("Full video object:", video);

        // Use the path directly without file:// prefix for expo-av
        setVideoUri(video.path);
        setModalVisible(true);
      },
      onRecordingError: (error) => {
        console.error("Recording error:", error);
        setIsRecording(false);
      },
    });
  };

  const stopRecording = async () => {
    if (cameraRef.current) {
      await cameraRef.current.stopRecording();
      setIsRecording(false);
    }
  };

  const handleSaveMedia = async () => {
    const uri = videoUri || photoUri;
    if (uri) {
      try {
        // Remove file:// prefix for MediaLibrary if present
        const cleanUri = uri.startsWith("file://")
          ? uri.replace("file://", "")
          : uri;
        await MediaLibrary.createAssetAsync(cleanUri);
        console.log("Media saved to library");
        setModalVisible(false);
        setVideoUri(null);
        setPhotoUri(null);
      } catch (error) {
        console.log("Error saving media:", error);
      }
    }
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      // Clear any existing state before taking new picture
      setVideoUri(null);
      setPhotoUri(null);
      setModalVisible(false);

      const photo = await cameraRef.current.takePhoto();
      console.log("Photo taken:", photo.path);
      console.log("Full photo object:", photo);

      // Format the URI properly for React Native Image component
      const photoUri = photo.path.startsWith("file://")
        ? photo.path
        : `file://${photo.path}`;
      setPhotoUri(photoUri);
      setModalVisible(true);
    }
  };

  const toggleCamera = () => {
    if (!device) return;
    setCameraPosition((prevPosition) =>
      prevPosition === "front" ? "back" : "front"
    );
  };

  const hangleCloseModal = () => {
    setModalVisible(false);
    setVideoUri(null);
    setPhotoUri(null);
    setIsRecording(false);
  };

  if (!permission) return <View></View>;

  if (!device || device === null) return <View></View>;

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      <Camera
        style={StyleSheet.absoluteFill}
        ref={cameraRef}
        device={device}
        isActive={true}
        photo={true}
        video={true}
        audio={true}
        resizeMode="cover"
      />

      <TouchableOpacity
        onPress={takePicture}
        style={{
          position: "absolute",
          width: 60,
          height: 60,
          alignItems: "center",
          justifyContent: "center",
          bottom: 75,
          left: 70,
          padding: 10,
          backgroundColor: "rgba(0, 0, 0, 0.2)",
          borderRadius: 50,
        }}
      >
        <Icon name="camera" size={30} color="white" />
      </TouchableOpacity>

      <TouchableOpacity
        onPressIn={startRecording}
        onPressOut={stopRecording}
        style={{
          width: 70,
          height: 70,
          borderRadius: 35,
          borderWidth: 8,
          borderColor: "red",
          position: "absolute",
          bottom: 70,
          alignSelf: "center",
        }}
      />

      <TouchableOpacity
        onPress={toggleCamera}
        style={{
          position: "absolute",
          width: 60,
          height: 60,
          alignItems: "center",
          justifyContent: "center",
          bottom: 75,
          right: 70,
          padding: 10,
          backgroundColor: "rgba(0, 0, 0, 0.2)",
          borderRadius: 50,
        }}
      >
        <Icon name="refresh" size={30} color="white" />
      </TouchableOpacity>

      {(videoUri || photoUri) && (
        <Modal
          animationType="slide"
          transparent={false}
          visible={modalVisible}
          onRequestClose={hangleCloseModal}
        >
          <View style={styles.videoContainer}>
            {videoUri && !photoUri && (
              <>
                {console.log(
                  "Modal state - videoUri:",
                  videoUri,
                  "photoUri:",
                  photoUri
                )}
                {console.log("Rendering video with URI:", videoUri)}
                <VideoView
                  style={{ width: screenWidth, height: screenHeight }}
                  player={player}
                  allowsFullscreen={false}
                  allowsPictureInPicture={false}
                  contentFit="cover"
                />
              </>
            )}
            {photoUri && !videoUri && (
              <>
                {console.log("Rendering photo with URI:", photoUri)}
                <Image
                  source={{ uri: photoUri }}
                  resizeMode="cover"
                  style={{
                    width: screenWidth,
                    height: screenHeight,
                    backgroundColor: "#000",
                  }}
                  onError={(error) => console.log("Image load error:", error)}
                  onLoad={() => console.log("Image loaded successfully")}
                />
              </>
            )}

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.button}
                onPress={hangleCloseModal}
              >
                <Text style={{ color: "#000" }}>Fechar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={handleSaveMedia}>
                <Text style={{ color: "#000" }}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  videoContainer: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  buttonContainer: {
    position: "absolute",
    zIndex: 99,
    flexDirection: "row",
    gap: 14,
  },
  button: {
    backgroundColor: "white",
    paddingLeft: 24,
    paddingRight: 24,
    paddingTop: 8,
    paddingBottom: 8,
    top: 24,
    left: 24,
    borderRadius: 4,
  },
});
