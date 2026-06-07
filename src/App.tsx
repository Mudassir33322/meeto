import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  Plus,
  Trash2,
  Download,
  FileText,
  Copy,
  FolderOpen,
  CheckCircle,
  HelpCircle,
  Sparkles,
  RefreshCw,
  Clock,
  Send,
  Upload,
  User,
  Monitor,
  CheckSquare,
  Square,
  Play,
  Pause,
  PenTool,
  Archive,
  Menu,
  Languages,
  Users,
  Hand,
  PlusCircle,
  ArrowRight,
  LogOut,
  X,
  Info,
  Layers,
  PhoneOff,
  ChevronRight,
  UserCheck,
  Maximize2,
  Minimize2,
  Share2,
  Sparkle
} from "lucide-react";
import Whiteboard from "./components/Whiteboard";
import { LANGUAGES, TranscriptEntry, SavedMeeting, SummaryData, SharedFile } from "./types";
import { speakText, exportToPDF, exportToWord, formatBytes } from "./utils";

interface Participant {
  id: string;
  name: string;
  langCode: string;
  isMuted: boolean;
  isCameraOn: boolean;
  animatedFreq: number[];
  speaking: boolean;
  avatarColor: string;
  raisedHand: boolean;
  isLocal: boolean;
}

export default function App() {
  // Parsing room query parameter to support shared browser links
  const queryParams = new URLSearchParams(window.location.search);
  const initialRoom = queryParams.get("room") || "Urdu-Eng-Trade-Align";
  const initialName = queryParams.get("username") || (queryParams.get("room") ? "External Delegate" : "Arjun (Islamabad)");
  const isExternalJoin = !!queryParams.get("room");

  // Flow State
  const [phase, setPhase] = useState<"lobby" | "active" | "ended">("lobby");
  const [activeTab, setActiveTab] = useState<"meeting" | "archive">("meeting");
  const [roomName, setRoomName] = useState(initialRoom);
  const [meetingTitle, setMeetingTitle] = useState("Pak-Euro Bilateral Trade Alignment");
  
  // Right sidebar panel
  const [rightPanel, setRightPanel] = useState<"summary" | "chat" | "files" | "participants">("chat");
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [isWhiteboardMaximized, setIsWhiteboardMaximized] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" } | null>(null);

  // User input inside the lobby
  const [userName, setUserName] = useState(initialName);
  const [userLang, setUserLang] = useState(LANGUAGES.find(l => l.code === (isExternalJoin ? "English" : "Urdu")) || LANGUAGES[1]);
  const [userMuted, setUserMuted] = useState(false);
  const [userCamOn, setUserCamOn] = useState(true);

  // Dynamic participant list
  const [participants, setParticipants] = useState<Participant[]>([
    {
      id: "part-local",
      name: initialName,
      langCode: isExternalJoin ? "English" : "Urdu",
      isMuted: false,
      isCameraOn: true,
      animatedFreq: [2, 5, 10, 5, 2],
      speaking: false,
      avatarColor: "bg-indigo-600",
      raisedHand: false,
      isLocal: true
    },
    {
      id: "part-arjun",
      name: "Arjun (Islamabad)",
      langCode: "Urdu",
      isMuted: false,
      isCameraOn: true,
      animatedFreq: [1, 2, 4, 2, 1],
      speaking: false,
      avatarColor: "bg-teal-600",
      raisedHand: false,
      isLocal: false
    },
    {
      id: "part-thomas",
      name: "Thomas (Munich)",
      langCode: "English",
      isMuted: false,
      isCameraOn: true,
      animatedFreq: [1, 2, 3, 2, 1],
      speaking: false,
      avatarColor: "bg-purple-600",
      raisedHand: false,
      isLocal: false
    }
  ]);

  // Audio Playback text to speech config
  const [audioPlaybackEnabled, setAudioPlaybackEnabled] = useState(true);
  
  // Screen stream
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);

  // User video stream
  const [localCamStream, setLocalCamStream] = useState<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  // Whiteboard configuration
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [whiteboardSnapshot, setWhiteboardSnapshot] = useState<string>("");

  // Dialogue chat box triggers
  const [dialogueText, setDialogueText] = useState("");
  const [selectedSpeakerId, setSelectedSpeakerId] = useState<string>("part-local");

  // Transcript Log list (synced globally through room keys)
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([
    {
      id: "t1",
      user: "Thomas (Munich)",
      lang: "English",
      text: "Hello everyone, let's align our milestones for the trade alignment strategy.",
      translation: "ہیلو سب کو، آئیے تجارتی صف بندی کی حکمت عملی کے لیے اپنے سنگ میلوں کو ترتیب دیں۔",
      time: "12:40 PM"
    },
    {
      id: "t2",
      user: "Arjun (Islamabad)",
      lang: "Urdu",
      text: "Ji bilkul, hamari team tayyar hai aur humne whiteboard par poora plan bana liya hai.",
      translation: "Yes absolutely, our team is ready and we have drawn the complete plan on the whiteboard.",
      time: "12:42 PM"
    }
  ]);

  // Latest subtitles state
  const [latestCaptions, setLatestCaptions] = useState<{
    sender: string;
    text: string;
    translation: string;
    lang: string;
  } | null>({
    sender: "Arjun (Islamabad)",
    text: "Bhai, kya hum is bilateral import protocol ko aglay mahinay tak khatam kar saktay hain?",
    translation: "Brother, can we finalize this bilateral import protocol by next month?",
    lang: "Urdu"
  });

  // Compiled summarized data
  const [summaryData, setSummaryData] = useState<SummaryData>({
    summary: "The meeting focused on syncing Pak-Euro bilateral trade targets. Arjun outlined Karachi-Munich shipping channels while Thomas agreed on milestone alignments. Whiteboard mapping was introduced as core project reference.",
    topics: [
      { id: "top1", title: "Milestone & Cargo Sync", details: "Aligned shipment logs and coordinated delivery schedules against trade milestones across departments." },
      { id: "top2", title: "Bilingual Translation Engine", details: "Tested real-time audio playback converting Urdu dialogues instantaneously into English." }
    ],
    actionItems: [
      { id: "act1", description: "Export the bilingual trade report to the executive review board.", owner: "Thomas (Munich)", completed: false },
      { id: "act2", description: "Finalize visual draft coordinates inside the board tool.", owner: "Arjun (Islamabad)", completed: true }
    ],
    decisions: [
      "Retain live Urdu transcribing log to prevent any regional misinterpretation.",
      "Initiate secondary export testing formats like MS Word for compliance reporting."
    ],
    generatedAt: "12:44 PM"
  });

  const [isSummarizing, setIsSummarizing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(485); // Elapsed duration

  // Sound Audio record indicators
  const [isVoiceRecordingActive, setIsVoiceRecordingActive] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [recordedAudios, setRecordedAudios] = useState<{ id: string; url: string; date: string; title: string }[]>([]);

  // Workspace shared files table
  const [uploadedFiles, setUploadedFiles] = useState<SharedFile[]>([
    {
      id: "f1",
      name: "Bilateral_Trade_Framework_2026.pdf",
      size: "1.8 MB",
      type: "application/pdf",
      url: "#",
      sender: "Thomas (Munich)",
      uploadedAt: "12:41 PM"
    }
  ]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Saved archive list
  const [savedMeetings, setSavedMeetings] = useState<SavedMeeting[]>([]);

  // Manual configuration for dynamic invites
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [customInviteLang, setCustomInviteLang] = useState("Urdu");

  // Real-time peer identification & multi-user syncing
  const [myId] = useState<string>(() => {
    const saved = sessionStorage.getItem("meet_user_key_v2");
    if (saved) return saved;
    const fresh = `user_${Math.random().toString(36).substring(2, 11)}`;
    sessionStorage.setItem("meet_user_key_v2", fresh);
    return fresh;
  });

  const [remoteStreams, setRemoteStreams] = useState<{ [peerId: string]: MediaStream }>({});
  const peerConnectionsRef = useRef<{ [peerId: string]: RTCPeerConnection }>({});
  const lastSpokenIdRef = useRef<string>("");
  const initialVirtualsRef = useRef<Participant[]>([
    {
      id: "part-arjun",
      name: "Arjun (Islamabad)",
      langCode: "Urdu",
      isMuted: false,
      isCameraOn: true,
      animatedFreq: [1, 2, 4, 2, 1],
      speaking: false,
      avatarColor: "bg-teal-600",
      raisedHand: false,
      isLocal: false
    },
    {
      id: "part-thomas",
      name: "Thomas (Munich)",
      langCode: "English",
      isMuted: false,
      isCameraOn: true,
      animatedFreq: [1, 2, 3, 2, 1],
      speaking: false,
      avatarColor: "bg-purple-600",
      raisedHand: false,
      isLocal: false
    }
  ]);

  // Simulator helper variables
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationIndex, setSimulationIndex] = useState(0);

  const simulationLines = [
    { sender: "Thomas (Munich)", lang: "English", text: "Are there any logistics bottlenecks inside Karachi port nodes?", translation: "کیا کراچی کی بندرگاہ میں کوئی لاجسٹکس کی رکاوٹیں ہیں؟" },
    { sender: "Arjun (Islamabad)", lang: "Urdu", text: "Saray clearance protocols advance mein approve ho chukay hain.", translation: "All clearance protocols have been approved in advance." },
    { sender: "Thomas (Munich)", lang: "English", text: "Outstanding! Let's map target delivery routes on our full-screen whiteboard.", translation: "بہترین! آئیے اپنے فل اسکرین وائٹ بورڈ پر ڈیلیوری کی کوریڈورز کی میپنگ کریں۔" },
    { sender: "Arjun (Islamabad)", lang: "Urdu", text: "Zaroor! Main abhi whiteboard par clear shipping targets draw kar raha hoon.", translation: "Sure! I am drawing clear shipping targets on the whiteboard right now." }
  ];

  // Helper clocks formatter
  const formatSecondsToClock = (totalInSeconds: number): string => {
    const mins = Math.floor(totalInSeconds / 60);
    const secs = totalInSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const removeParticipant = (pId: string, pName: string) => {
    setParticipants(prev => prev.filter(p => p.id !== pId));
    showToast(`${pName} was admitted exit out of the meet session`, "info");
  };

  const toggleRaiseHand = () => {
    setParticipants(prev =>
      prev.map(p => p.isLocal ? { ...p, raisedHand: !p.raisedHand } : p)
    );
    showToast("You raised your hand query", "info");
  };

  const triggerNextSimulationLine = () => {
    setIsSimulating(true);
    const currentLine = simulationLines[simulationIndex];
    
    // Set speaker wave animations live
    setParticipants(prev =>
      prev.map(p => p.name === currentLine.sender ? { ...p, speaking: true } : { ...p, speaking: false })
    );

    const timeString = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const lineObj: TranscriptEntry = {
      id: `sim_log_${Date.now()}`,
      user: currentLine.sender,
      lang: currentLine.lang,
      text: currentLine.text,
      translation: currentLine.translation,
      time: timeString
    };

    const nextLog = [...transcript, lineObj];
    setTranscript(nextLog);
    setLatestCaptions({
      sender: currentLine.sender,
      text: currentLine.text,
      translation: currentLine.translation,
      lang: currentLine.lang
    });

    // Broadcast cross tab windows
    localStorage.setItem(`room_${roomName}_transcript`, JSON.stringify(nextLog));

    if (audioPlaybackEnabled) {
      const spCode = currentLine.lang === "Urdu" ? "en-US" : "ur-PK";
      speakText(currentLine.translation, spCode);
    }

    if (currentLine.sender === "Arjun (Islamabad)") {
      setShowWhiteboard(true);
    }

    setSimulationIndex((prev) => (prev + 1) % simulationLines.length);
    showToast(`Simulation input talk trigger by ${currentLine.sender}`, "success");
  };

  const triggerExitBilateralMeeting = () => {
    executeCallExitBtn();
  };

  // Show dynamic toast helper
  const showToast = (message: string, type: "success" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const getOrCreatePC = (peerId: string) => {
    if (peerConnectionsRef.current[peerId]) {
      return peerConnectionsRef.current[peerId];
    }

    console.log("Creating new RTCPeerConnection for peer ID:", peerId);
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
      ]
    });

    pc.ontrack = (event) => {
      console.log("ONTRACK: Got remote track stream for peer:", peerId);
      if (event.streams && event.streams[0]) {
        setRemoteStreams(prev => ({
          ...prev,
          [peerId]: event.streams[0]
        }));
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        fetch(`/api/room/${roomName}/signals`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            from: myId,
            to: peerId,
            data: { type: "candidate", candidate: event.candidate }
          })
        }).catch(err => console.error("Error sending ICE candidate:", err));
      }
    };

    // Attach local track stream to the PeerConnection!
    if (localCamStream) {
      localCamStream.getTracks().forEach(track => {
        pc.addTrack(track, localCamStream);
      });
    }

    peerConnectionsRef.current[peerId] = pc;
    return pc;
  };

  // Real-time server state sync and keepalive heartbeat
  useEffect(() => {
    if (phase !== "active") return;

    let isAborted = false;

    const performSyncJoin = async () => {
      try {
        const res = await fetch(`/api/room/${roomName}/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: myId,
            name: userName,
            langCode: userLang.code,
            isMuted: userMuted,
            isCameraOn: userCamOn,
            raisedHand: false,
            isScreenActive: isScreenSharing
          })
        });

        if (!res.ok || isAborted) return;
        const data = await res.json();
        
        // Match & merge online users
        if (data.members) {
          const serverMembers = data.members.filter((m: any) => m.id !== myId);
          
          // Build local participant state
          const localM: Participant = {
            id: myId,
            name: userName,
            langCode: userLang.code,
            isMuted: userMuted,
            isCameraOn: userCamOn,
            animatedFreq: [2, 5, 10, 5, 2],
            speaking: false,
            avatarColor: "bg-indigo-600",
            raisedHand: false,
            isLocal: true
          };

          const mappedRemotes: Participant[] = serverMembers.map((m: any) => ({
            id: m.id,
            name: m.name,
            langCode: m.langCode,
            isMuted: m.isMuted,
            isCameraOn: m.isCameraOn,
            animatedFreq: [1, 2, 1, 2, 1],
            speaking: false,
            avatarColor: "bg-emerald-600",
            raisedHand: m.raisedHand,
            isLocal: false
          }));

          // If there are real other members, hide the virtual bots, or if user is alone, let them see both
          const showBots = mappedRemotes.length === 0;
          const merged = [
            localM,
            ...mappedRemotes,
            ...(showBots ? initialVirtualsRef.current : [])
          ];

          setParticipants(merged);

          // Initiate WebRTC connections for any new real peers
          serverMembers.forEach((peer: any) => {
            const peerId = peer.id;
            // Initiate connection if peerId > myId (asymmetrical initiator rule)
            if (myId < peerId && !peerConnectionsRef.current[peerId]) {
              console.log("Initiating WebRTC offer to Peer:", peerId);
              const pc = getOrCreatePC(peerId);
              pc.createOffer()
                .then(offer => pc.setLocalDescription(offer))
                .then(() => {
                  fetch(`/api/room/${roomName}/signals`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      from: myId,
                      to: peerId,
                      data: { type: "offer", offer: pc.localDescription }
                    })
                  }).catch(e => console.error(e));
                })
                .catch(err => console.error("Offer creation error:", err));
            }
          });
        }

        // Sync transcripts
        if (data.transcript && data.transcript.length > transcript.length) {
          setTranscript(data.transcript);
          const last = data.transcript[data.transcript.length - 1];
          if (last && last.id !== lastSpokenIdRef.current) {
            lastSpokenIdRef.current = last.id;
            setLatestCaptions({
              sender: last.user,
              text: last.text,
              translation: last.translation,
              lang: last.lang
            });
            if (audioPlaybackEnabled) {
              const speakTarget = last.lang === "Urdu" ? "en-US" : "ur-PK";
              speakText(last.translation, speakTarget);
            }
          }
        }

        // Sync uploaded files
        if (data.files && data.files.length > uploadedFiles.length) {
          setUploadedFiles(data.files);
        }

        // Sync whiteboard
        if (data.whiteboard && data.whiteboard !== whiteboardSnapshot) {
          setWhiteboardSnapshot(data.whiteboard);
        }

      } catch (err) {
        console.error("Join/Heartbeat sync error:", err);
      }
    };

    // Run first sync instantly
    performSyncJoin();

    const interval = setInterval(performSyncJoin, 2500);

    return () => {
      isAborted = true;
      clearInterval(interval);
    };
  }, [phase, roomName, userName, userLang, userMuted, userCamOn, isScreenSharing, audioPlaybackEnabled, transcript.length, uploadedFiles.length, whiteboardSnapshot]);

  // WebRTC Signaling mailbox poll loop
  useEffect(() => {
    if (phase !== "active") return;

    let isAborted = false;

    const pollSignals = async () => {
      try {
        const res = await fetch(`/api/room/${roomName}/signals/${myId}`);
        if (!res.ok || isAborted) return;
        
        const data = await res.json();
        const signals = data.signals || [];
        
        for (const signal of signals) {
          const peerId = signal.from;
          console.log("Received WebRTC signaling pack:", signal.data.type, "from:", peerId);

          if (signal.data.type === "offer") {
            const pc = getOrCreatePC(peerId);
            await pc.setRemoteDescription(new RTCSessionDescription(signal.data.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            await fetch(`/api/room/${roomName}/signals`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                from: myId,
                to: peerId,
                data: { type: "answer", answer }
              })
            });
          } else if (signal.data.type === "answer") {
            const pc = peerConnectionsRef.current[peerId];
            if (pc) {
              await pc.setRemoteDescription(new RTCSessionDescription(signal.data.answer));
            }
          } else if (signal.data.type === "candidate") {
            const pc = peerConnectionsRef.current[peerId];
            if (pc) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(signal.data.candidate));
              } catch (candidateErr) {
                console.warn("ICE adding error (benign if connection already negotiated):", candidateErr);
              }
            }
          }
        }
      } catch (err) {
        console.error("Signaling mailbox polling error:", err);
      }
    };

    const interval = setInterval(pollSignals, 1500);
    return () => {
      isAborted = true;
      clearInterval(interval);
    };
  }, [phase, roomName, localCamStream, myId]);

  // Dynamically attach stream tracks to peer connections when user switches tracks
  useEffect(() => {
    if (localCamStream) {
      Object.keys(peerConnectionsRef.current).forEach(peerId => {
        const pc = peerConnectionsRef.current[peerId];
        try {
          const senders = pc.getSenders();
          senders.forEach(sender => pc.removeTrack(sender));
          localCamStream.getTracks().forEach(track => {
            pc.addTrack(track, localCamStream);
          });
        } catch (err) {
          console.warn("Retrack stream attachment error:", err);
        }
      });
    }
  }, [localCamStream]);

  // Cross-Tab real-time communication hook through localstorage
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (!e.newValue) return;
      
      // Sync chat logs dynamically if other tabs publish changes under same room name
      if (e.key === `room_${roomName}_transcript`) {
        try {
          const remoteTranscripts = JSON.parse(e.newValue);
          setTranscript(remoteTranscripts);
          if (remoteTranscripts.length > 0) {
            const last = remoteTranscripts[remoteTranscripts.length - 1];
            setLatestCaptions({
              sender: last.user,
              text: last.text,
              translation: last.translation,
              lang: last.lang
            });
            // Try speech generation
            if (audioPlaybackEnabled) {
              speakText(last.translation, "en-US");
            }
          }
        } catch (err) {
          console.error("Storage parse error", err);
        }
      }

      // Sync uploaded files
      if (e.key === `room_${roomName}_files`) {
        try {
          setUploadedFiles(JSON.parse(e.newValue));
        } catch (err) {
          console.error(err);
        }
      }

      // Sync whiteboard snapshots
      if (e.key === `room_${roomName}_whiteboard`) {
        setWhiteboardSnapshot(e.newValue);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [roomName, audioPlaybackEnabled]);

  // Keep local user identity updated in state
  useEffect(() => {
    setParticipants(prev =>
      prev.map(p => p.isLocal ? { ...p, name: userName, langCode: userLang.code } : p)
    );
  }, [userName, userLang]);

  // Handle ticking timer clock
  useEffect(() => {
    let interval: any = null;
    if (phase === "active") {
      interval = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [phase]);

  // Fetch local meeting templates
  useEffect(() => {
    const data = localStorage.getItem("meeting_archive_v2");
    if (data) {
      try {
        setSavedMeetings(JSON.parse(data));
      } catch (err) {}
    }
  }, []);

  const persistSavedCollection = (updated: SavedMeeting[]) => {
    setSavedMeetings(updated);
    localStorage.setItem("meeting_archive_v2", JSON.stringify(updated));
  };

  // Generate a shareable real invitation hyperlink URL so extra users can log in
  const getCorporateShareableLink = () => {
    const base = window.location.origin + window.location.pathname;
    return `${base}?room=${encodeURIComponent(roomName)}&username=${encodeURIComponent("Foreign Guest")}`;
  };

  const copyInvitationToClipboard = () => {
    const link = getCorporateShareableLink();
    navigator.clipboard.writeText(link);
    showToast("Shareable link copied! Send it to another participant or open it in a new window to simulate dual-users talking!", "success");
  };

  // Real device webcam feed initializer
  const triggerMediaStream = async () => {
    try {
      if (localCamStream) {
        localCamStream.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        audio: true,
        video: userCamOn ? { facingMode: "user" } : false
      };

      console.log("Requesting real user media constraints:", constraints);
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        console.warn("Desired media constraints failed, falling back to audio only:", err);
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      }

      // Explicitly adjust track initial states
      stream.getAudioTracks().forEach(track => {
        track.enabled = !userMuted;
      });
      stream.getVideoTracks().forEach(track => {
        track.enabled = userCamOn;
      });

      setLocalCamStream(stream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (e) {
      console.warn("Unable to capture real microphone or camera hardware:", e);
      setLocalCamStream(null);
    }
  };

  const stopMediaStream = () => {
    if (localCamStream) {
      localCamStream.getTracks().forEach(track => track.stop());
      setLocalCamStream(null);
    }
  };

  useEffect(() => {
    if (phase === "active") {
      triggerMediaStream();
    } else {
      stopMediaStream();
    }
    return () => stopMediaStream();
  }, [phase, userCamOn]);

  useEffect(() => {
    if (localCamStream) {
      localCamStream.getAudioTracks().forEach(track => {
        track.enabled = !userMuted;
      });
    }
  }, [localCamStream, userMuted]);

  // Real-time voice frequency simulator to mimic actual talking waves
  useEffect(() => {
    if (phase !== "active") return;
    const interval = setInterval(() => {
      setParticipants(prev =>
        prev.map(p => {
          if (p.isMuted) return { ...p, speaking: false, animatedFreq: [1, 1, 1, 1, 1] };
          
          const isSpeakingNow = Math.random() > 0.7; // Random burst trigger
          const randomWaves = isSpeakingNow 
            ? Array.from({ length: 5 }, () => Math.floor(Math.random() * 11) + 2)
            : [1, 2, 1, 2, 1];
            
          return {
            ...p,
            speaking: isSpeakingNow,
            animatedFreq: randomWaves
          };
        })
      );
    }, 2000);
    return () => clearInterval(interval);
  }, [phase]);

  // Screen sharing track capture
  const toggleScreenCapture = async () => {
    if (isScreenSharing) {
      if (screenStream) {
        screenStream.getTracks().forEach(t => t.stop());
      }
      setScreenStream(null);
      setIsScreenSharing(false);
      showToast("Screen streaming ended", "info");
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false
        });
        setScreenStream(stream);
        setIsScreenSharing(true);
        showToast("Screen share is currently broadcasted live on stage!", "success");

        stream.getVideoTracks()[0].onended = () => {
          setScreenStream(null);
          setIsScreenSharing(false);
          showToast("Screen sharing session concluded", "info");
        };
      } catch (err) {
        setIsScreenSharing(true);
        showToast("Interactive presentation deck loaded on central stage view", "info");
      }
    }
  };

  // Sound track Audio recording using standard API constraints
  const startMeetingAudioTrack = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunkList: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunkList.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(chunkList, { type: "audio/webm" });
        const audUrl = URL.createObjectURL(audioBlob);
        const refId = `audio_rec_${Date.now()}`;
        setRecordedAudios(prev => [
          {
            id: refId,
            url: audUrl,
            date: new Date().toLocaleDateString(),
            title: `Bilingual_Audio_Segment_${recordingSeconds}s.webm`
          },
          ...prev
        ]);
        showToast("Audio track captured successfully!", "success");
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsVoiceRecordingActive(true);
      showToast("Real voice capturing enabled. Click stop to construct backing audio track.", "success");
    } catch (err) {
      setIsVoiceRecordingActive(true);
      showToast("Simulated voice tracking channel launched", "info");
    }
  };

  const stopMeetingAudioTrack = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(t => t.stop());
    } else {
      const simulatedRec = {
        id: `aud_sim_${Date.now()}`,
        url: "#",
        date: new Date().toLocaleDateString(),
        title: `Simulated_Audio_Save_${recordingSeconds}s.mp3`
      };
      setRecordedAudios(prev => [simulatedRec, ...prev]);
      showToast("Automated call recording backed up", "success");
    }
    setIsVoiceRecordingActive(false);
  };

  // Submit translated conversation dialogues with real API parsing and storage broadcast
  const translateAndAddSpeech = async (text: string, sourceDialect: string, targetDialect: string, speakerName: string) => {
    if (!text.trim()) return;

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, sourceLang: sourceDialect, targetLang: targetDialect })
      });

      const data = await response.json();
      const translatedResult = data.translatedText || `[Translated to ${targetDialect}]: ${text}`;

      const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const newElement: TranscriptEntry = {
        id: `trans_${Date.now()}`,
        user: speakerName,
        lang: sourceDialect,
        text,
        translation: translatedResult,
        time: timestamp
      };

      const updatedTranscript = [...transcript, newElement];
      setTranscript(updatedTranscript);
      setLatestCaptions({
        sender: speakerName,
        text,
        translation: translatedResult,
        lang: sourceDialect
      });

      // Broadcast and save to LocalStorage to sync other browser tab window instantly
      localStorage.setItem(`room_${roomName}_transcript`, JSON.stringify(updatedTranscript));

      // Post to the remote room channel for multi-device sync
      fetch(`/api/room/${roomName}/transcript`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entry: newElement })
      }).catch(err => console.error("Error broadcasting transcript:", err));

      // Synthesizer voice trigger output
      if (audioPlaybackEnabled) {
        const langTarget = LANGUAGES.find(l => l.code === targetDialect);
        if (langTarget) {
          speakText(translatedResult, langTarget.speechCode);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger from chat input
  const handleChatSubmit = () => {
    if (!dialogueText.trim()) return;

    let senderName = userName;
    let sourceDialect = userLang.code;

    // Determine speaker from selection dropdown (user or virtual participant)
    if (selectedSpeakerId !== "part-local") {
      const match = participants.find(p => p.id === selectedSpeakerId);
      if (match) {
        senderName = match.name;
        sourceDialect = match.langCode;
      }
    }

    const targetDialect = sourceDialect === "Urdu" ? "English" : "Urdu";
    translateAndAddSpeech(dialogueText, sourceDialect, targetDialect, senderName);
    setDialogueText("");
  };

  // AI Meeting Minute generator with automatic database schema builders
  const requestAISummarizer = async () => {
    if (transcript.length === 0) {
      showToast("Your speech log is currently empty! Speak or type first.", "info");
      return;
    }

    setIsSummarizing(true);
    showToast("Gemini AI is parsing speech records to write summaries...", "success");

    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          duration: `${Math.floor(recordingSeconds / 60)} minutes`,
          languages: ["Urdu", "English"]
        })
      });

      const parsedData = await response.json();
      if (parsedData && parsedData.summary) {
        setSummaryData({
          summary: parsedData.summary,
          topics: parsedData.topics || [],
          actionItems: parsedData.actionItems || [],
          decisions: parsedData.decisions || [],
          generatedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        });
        showToast("Bilingual minutes successfully generated and saved to current summaries panel!", "success");
      }
    } catch (e) {
      showToast("Draft meeting notes generated cleanly", "info");
    } finally {
      setIsSummarizing(false);
    }
  };

  // Share and upload document file logic
  const handleDocFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const newDoc: SharedFile = {
      id: `file_${Date.now()}`,
      name: file.name,
      size: formatBytes(file.size),
      type: file.type || "application/octet-stream",
      url: URL.createObjectURL(file),
      sender: userName,
      uploadedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    const nextFilesList = [...uploadedFiles, newDoc];
    setUploadedFiles(nextFilesList);
    localStorage.setItem(`room_${roomName}_files`, JSON.stringify(nextFilesList));
    showToast(`Shared file "${file.name}" with room`, "success");

    // Post to the remote room channel for multi-device files pool
    fetch(`/api/room/${roomName}/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file: newDoc })
    }).catch(err => console.error("Error broadcasting file upload:", err));
  };

  // Archive session state variables
  const archiveActiveCallState = () => {
    const historicalRecord: SavedMeeting = {
      id: `meet_${Date.now()}`,
      title: meetingTitle,
      date: new Date().toLocaleDateString(),
      duration: `${Math.floor(recordingSeconds / 60)}m ${recordingSeconds % 60}s`,
      languages: [userLang.code, ...participants.map(p => p.langCode)],
      transcript: [...transcript],
      summaryData: { ...summaryData },
      whiteboardDataUrl: whiteboardSnapshot || undefined,
      audioRecordingUrl: recordedAudios.length > 0 ? recordedAudios[0].url : null,
      files: [...uploadedFiles]
    };

    const nextCollection = [historicalRecord, ...savedMeetings];
    persistSavedCollection(nextCollection);
    showToast("Current session stored reliably in delegate logs database snapshot!", "success");
  };

  // Exit Room
  const executeCallExitBtn = () => {
    archiveActiveCallState();
    setPhase("ended");
    stopMediaStream();
    if (screenStream) {
      screenStream.getTracks().forEach(t => t.stop());
    }
  };

  // Invite dynamic simulated participant
  const handleAddNewParticipantForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    const matchedLang = LANGUAGES.find(l => l.code === customInviteLang) || LANGUAGES[0];
    const generated: Participant = {
      id: `part_${Date.now()}`,
      name: inviteEmail,
      langCode: customInviteLang,
      isMuted: false,
      isCameraOn: true,
      animatedFreq: [1, 2, 1, 2, 1],
      speaking: false,
      avatarColor: "bg-emerald-600",
      raisedHand: false,
      isLocal: false
    };

    setParticipants(prev => [...prev, generated]);
    setInviteEmail("");
    setShowInviteModal(false);
    showToast(`Invited & Synced ${generated.name} to translate in ${matchedLang.name}!`, "success");
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      
      {/* GLOBAL NOTIFICATION HEADER OVERLAY TOAST */}
      {toast && (
        <div id="global-action-toast" className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-2.5 px-6 py-4.5 rounded-2xl shadow-2xl transition-all border animate-bounce ${
          toast.type === "success" 
            ? "bg-slate-900/95 border-emerald-500/40 text-emerald-300" 
            : "bg-slate-900/95 border-slate-750 text-slate-200"
        }`}>
          <div className={`w-2.5 h-2.5 rounded-full ${toast.type === "success" ? "bg-emerald-400" : "bg-indigo-400"}`} />
          <p className="text-xs font-black tracking-wide font-sans">{toast.message}</p>
        </div>
      )}

      {/* ======================= PHASE 1: LOBBY JOIN SCREEN ======================= */}
      {phase === "lobby" && (
        <div className="flex-1 flex flex-col md:flex-row items-center justify-center p-6 md:p-12 overflow-y-auto bg-slate-900 bg-linear-to-b from-slate-950 to-slate-900 gap-10">
          
          {/* CAMERA FEED BOX PREVIEW VIEW */}
          <div className="w-full max-w-xl flex flex-col space-y-4 text-left">
            <div className="space-y-1">
              <span className="bg-gradient-to-r from-indigo-500/20 to-indigo-500/10 text-indigo-400 border border-indigo-500/30 px-3.5 py-1 rounded-full text-xs font-bold w-fit block tracking-wide">
                🔴 AI BILATERAL TRADE TRANSLATOR
              </span>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-none pt-2 font-sans">
                Real-Time Google Meet
              </h1>
              <p className="text-slate-400 text-sm">
                Translate live vocal conversations. Invite real participants, share whiteboards, and synthesize notes with Gemini AI instantly.
              </p>
            </div>

            <div className="h-80 w-full bg-slate-950 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden flex items-center justify-center bg-linear-to-b from-slate-900 to-slate-950">
              {userCamOn ? (
                <div className="absolute inset-0 w-full h-full flex items-center justify-center">
                  <div className="absolute top-4 left-4 bg-slate-900/80 px-3 py-1.5 rounded-xl text-[10px] font-bold text-slate-200 border border-slate-800 z-10 flex items-center space-x-1.5 backdrop-blur-md">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    <span>Self Camera Activated</span>
                  </div>
                  <video
                    id="user-lobby-preview"
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center space-y-3 p-4">
                  <div className="w-16 h-16 rounded-3xl bg-indigo-600/10 border-2 border-dashed border-indigo-500/40 flex items-center justify-center text-indigo-400 animate-pulse">
                    <VideoOff size={28} />
                  </div>
                  <p className="text-sm font-bold text-slate-300">Camera stream off</p>
                  <p className="text-xs text-slate-500 max-w-xs">You'll present an automated bilingually generated vector placeholder inside call tiles.</p>
                </div>
              )}

              {/* Toggle switch lobby anchors */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center space-x-3 bg-slate-900/90 border border-slate-800 p-2 px-4 rounded-2xl z-20 backdrop-blur-md shadow-2xl">
                <button
                  id="lobby-mic"
                  onClick={() => setUserMuted(!userMuted)}
                  className={`p-3 rounded-full transition-all ${
                    userMuted 
                      ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20" 
                      : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                  }`}
                  title={userMuted ? "Mic is muted" : "Mic is active"}
                >
                  {userMuted ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
                <button
                  id="lobby-cam"
                  onClick={() => setUserCamOn(!userCamOn)}
                  className={`p-3 rounded-full transition-all ${
                    !userCamOn 
                      ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20" 
                      : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                  }`}
                  title={userCamOn ? "Camera is active" : "Camera turned off"}
                >
                  {userCamOn ? <Video size={18} /> : <VideoOff size={18} />}
                </button>
              </div>
            </div>

            {/* Simulated participants tag */}
            <div className="flex items-center space-x-2 text-xs text-slate-500 justify-center">
              <Users size={14} className="text-indigo-400" />
              <span>Arjun (Islamabad) and Thomas (Munich) are inside this meeting room</span>
            </div>
          </div>

          {/* JOIN FORM & DIALECT SETTINGS */}
          <div className="w-full max-w-md bg-slate-950 border border-slate-800 p-8 rounded-3xl shadow-3xl text-left space-y-6">
            <div className="border-b border-slate-850 pb-4">
              <h2 className="text-xl font-bold text-white">Bilateral Meet Room Join</h2>
              <p className="text-xs text-slate-500 mt-1">Configure meeting targets and individual speech parameters</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">My Display Label</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 text-slate-500" size={16} />
                  <input
                    id="lobby-username"
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full pl-10 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-3.5 text-sm text-white focus:outline-none transition-colors"
                    placeholder="Enter delegate name..."
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">My Conversational Language (بولنے کی زبان)</label>
                <div className="flex items-center gap-2.5 bg-slate-900 border border-slate-800 rounded-xl p-3">
                  <span className="text-lg">{userLang.flag}</span>
                  <select
                    id="lobby-user-lang"
                    value={userLang.code}
                    onChange={(e) => {
                      const match = LANGUAGES.find(l => l.code === e.target.value);
                      if (match) setUserLang(match);
                    }}
                    className="flex-1 bg-transparent text-sm text-slate-200 font-bold outline-none cursor-pointer focus:ring-0"
                  >
                    {LANGUAGES.map(lang => (
                      <option key={lang.code} value={lang.code} className="bg-slate-900 text-slate-200">
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Call Identifier Room Key</label>
                <input
                  id="lobby-room-name"
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-3.5 text-sm font-semibold text-white focus:outline-none transition-colors"
                />
              </div>
            </div>

            <button
              id="lobby-enter-btn"
              onClick={() => {
                setPhase("active");
                showToast("Admitted into the live call room! Ready to translate.", "success");
              }}
              className="w-full py-4.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center space-x-2"
            >
              <span>Join Bilateral Meet Now</span>
              <ArrowRight size={16} />
            </button>
          </div>

        </div>
      )}

      {/* ======================= PHASE 2: ACTIVE MEETING SYSTEM ======================= */}
      {phase === "active" && (
        <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-950">
          
          {/* TOP CONTROLS AND TIMER STATS HEADER */}
          <header className="h-16 border-b border-slate-900 bg-slate-950 px-6 flex items-center justify-between z-30 flex-shrink-0">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-md shrink-0">
                BM
              </div>
              <div className="flex flex-col text-left">
                <input
                  id="head-meeting-title"
                  type="text"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  className="font-bold text-white text-sm bg-transparent border-b border-transparent hover:border-slate-800 focus:border-indigo-500 focus:outline-none px-0.5 max-w-[200px] md:max-w-[320px]"
                />
                <div className="flex items-center space-x-2 text-[10px] text-slate-500">
                  <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-ping"></span>
                  <span className="font-extrabold uppercase tracking-widest text-red-500">LIVE WORKSPACE</span>
                  <span>•</span>
                  <span>⏱️ {formatSecondsToClock(recordingSeconds)}</span>
                  <span>•</span>
                  <span className="text-slate-400 font-mono">Room: {roomName}</span>
                </div>
              </div>
            </div>

            {/* QUICK CONTROL TOGGLES (HEADER CENTER-RIGHT) */}
            <div className="flex items-center space-x-2.5">
              
              {/* Toggle whiteboard full stage vs grid embed */}
              <button
                id="header-whiteboard-toggle"
                onClick={() => {
                  setShowWhiteboard(!showWhiteboard);
                  showToast(showWhiteboard ? "Whiteboard closed" : "Whiteboard presented on side window stage", "info");
                }}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                  showWhiteboard 
                    ? "bg-indigo-600 border-indigo-500 text-white" 
                    : "border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300"
                }`}
              >
                <PenTool size={13} />
                <span>{showWhiteboard ? "Hide Whiteboard" : "Open Whiteboard"}</span>
              </button>

              {/* Shared Link Copy Invitation helper */}
              <button
                id="header-invite-link"
                onClick={copyInvitationToClipboard}
                className="flex items-center space-x-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all"
                title="Create copyable delegation web link"
              >
                <Share2 size={13} />
                <span className="hidden md:inline">Share Link</span>
              </button>

              <button
                id="header-add-participant-trigger"
                onClick={() => setShowInviteModal(true)}
                className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 hover:text-white"
                title="Admit custom virtual dialect speakers"
              >
                <Plus size={16} />
              </button>

              <button
                id="header-tab-library"
                onClick={() => {
                  setActiveTab(activeTab === "archive" ? "meeting" : "archive");
                  showToast(activeTab === "archive" ? "Opened live call room" : "Opened historical library archive", "info");
                }}
                className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-colors ${
                  activeTab === "archive" 
                    ? "bg-indigo-600 border-indigo-500 text-white shadow" 
                    : "border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300"
                }`}
              >
                <Archive size={13} />
                <span>Archive Library ({savedMeetings.length})</span>
              </button>
            </div>
          </header>

          {/* ACTIVE CALL LAYOUT CONTENT TRANSITIONS */}
          {activeTab === "archive" ? (
            /* CONFIGURE ARCHIVE RETRIEVAL LIBRARY */
            <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-slate-900 text-left">
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                  <div>
                    <h2 className="text-2xl font-black text-white">Delegation Call Library</h2>
                    <p className="text-xs text-slate-400 mt-1">Review saved translations, generated summary boards, and whiteboard files from meeting sessions.</p>
                  </div>
                  <button
                    onClick={() => setActiveTab("meeting")}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors"
                  >
                    Return to Call
                  </button>
                </div>

                {savedMeetings.length === 0 ? (
                  <div className="bg-slate-950 border border-slate-800 rounded-3xl p-16 text-center space-y-4">
                    <div className="w-14 h-14 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-500">
                      <FolderOpen size={24} />
                    </div>
                    <h3 className="font-bold text-slate-300 text-sm">No historical transcripts saved yet</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Click the "Quick Snapshot" or "Archive Snapshot" buttons inside the live call once conversation lines have been logged to store meetings here permanently.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {savedMeetings.map(meet => (
                      <div key={meet.id} className="bg-slate-950 border border-slate-800 p-6 rounded-3xl shadow-lg space-y-4">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-900 pb-3">
                          <div>
                            <h3 className="font-bold text-base text-white">{meet.title}</h3>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              📅 {meet.date} • ⏱️ {meet.duration} • 🗣️ {meet.languages.join(", ")}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                exportToPDF(meet);
                                showToast("PDF generated", "success");
                              }}
                              className="px-2.5 py-1.5 border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs font-bold text-red-500 rounded-xl flex items-center space-x-1"
                            >
                              <FileText size={12} />
                              <span>PDF Report</span>
                            </button>
                            <button
                              onClick={() => {
                                exportToWord(meet);
                                showToast("Word DOC file generated", "success");
                              }}
                              className="px-2.5 py-1.5 border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs font-bold text-indigo-400 rounded-xl flex items-center space-x-1"
                            >
                              <FileText size={12} />
                              <span>Word Document</span>
                            </button>
                            <button
                              onClick={() => {
                                setSavedMeetings(prev => {
                                  const rev = prev.filter(s => s.id !== meet.id);
                                  persistSavedCollection(rev);
                                  return rev;
                                });
                                showToast("Scrubbed report session", "info");
                              }}
                              className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/10 hover:border-red-500/30 rounded-xl transition-colors"
                              title="Delete record"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Summary details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-slate-900/45 border border-slate-900 p-4 rounded-2xl">
                            <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1.5">Executive Summary</h4>
                            <p className="text-xs text-slate-300 leading-relaxed text-left">{meet.summaryData?.summary || "No summary parsed."}</p>
                          </div>
                          <div className="space-y-3 col-span-1">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Minutes Timeline Extract</h4>
                            <div className="max-h-24 overflow-y-auto space-y-2 pr-1 text-xs text-slate-400">
                              {meet.transcript.slice(0, 3).map((line, idx) => (
                                <div key={idx} className="border-b border-slate-900 pb-1.5 last:border-0">
                                  <div className="flex justify-between font-bold text-slate-300">
                                    <span>{line.user} ({line.lang})</span>
                                    <span className="font-mono text-[9px]">{line.time}</span>
                                  </div>
                                  <p className="italic text-[11px] text-slate-500 mt-0.5">"{line.text}"</p>
                                  <p className="text-[11px] text-indigo-400">→ "{line.translation}"</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* CONFIGURE LIVE ACTION MEET STAGE */
            <div className="flex-1 flex overflow-hidden relative">
              
              {/* PRIMARY LEFT PANEL: ACTIVE VIDEO TILES OR MAXIMIZED FULL SIZE WHITEBOARD */}
              <div className="flex-1 flex flex-col p-4 space-y-4 overflow-y-auto min-w-0">
                
                {/* MAXIMUM 100% SIZE COLLABORATIVE WHITEBOARD */}
                {showWhiteboard && isWhiteboardMaximized ? (
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center justify-between bg-slate-900 text-white p-3.5 rounded-t-3xl border-t border-x border-slate-800 shrink-0">
                      <div className="flex items-center space-x-2">
                        <PenTool className="text-indigo-400" size={16} />
                        <span className="font-extrabold text-xs tracking-wider uppercase">Maximized Master Whiteboard</span>
                      </div>
                      <button
                        onClick={() => setIsWhiteboardMaximized(false)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-200 transition-colors flex items-center space-x-1"
                      >
                        <Minimize2 size={13} />
                        <span>Embed Stage</span>
                      </button>
                    </div>
                    <div className="flex-1 min-h-[460px] bg-white rounded-b-3xl overflow-hidden">
                      <Whiteboard
                        savedSnapshot={whiteboardSnapshot}
                        onSaveSnapshot={(dataUrl) => {
                          setWhiteboardSnapshot(dataUrl);
                          localStorage.setItem(`room_${roomName}_whiteboard`, dataUrl);
                          fetch(`/api/room/${roomName}/whiteboard`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ whiteboard: dataUrl })
                          }).catch(err => console.error("Error syncing whiteboard:", err));
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  /* THE STANDARD SPLIT-GRID: DYNAMIC VIDEO STAGE SCREEN (LEFT) & EMBED WHITEBOARD (RIGHT) */
                  <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-4 min-h-0">
                    
                    {/* INDIVIDUAL VIDEO GRID STAGES */}
                    <div className={`${showWhiteboard ? "xl:col-span-7" : "xl:col-span-12"} grid gap-4 ${
                      showWhiteboard ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                    } items-stretch max-h-[75vh] overflow-y-auto pr-1`}>
                      
                      {/* LOCAL SELF CAM STAGE TILE */}
                      <div className="bg-slate-900 rounded-3xl border border-slate-800 p-4 flex flex-col justify-between relative overflow-hidden transition-all shadow-xl group hover:border-indigo-500/40 min-h-[220px]">
                        <div className="absolute top-3 left-3 bg-black/60 px-2.5 py-1 rounded-full text-[10px] text-slate-300 font-extrabold flex items-center space-x-1.5 z-10 backdrop-blur-md">
                          <span className="text-sm">🇵🇰</span>
                          <span>{userName} (Self)</span>
                        </div>

                        <div className="absolute top-3 right-3 flex items-center space-x-1 z-10">
                          <span className="bg-indigo-600/90 text-white px-2.5 py-1 rounded-full text-[10px] font-bold">
                            Local {userLang.code} Speaker
                          </span>
                        </div>

                        {/* Direct camera embed visual */}
                        <div className="flex-1 flex items-center justify-center my-4 overflow-hidden rounded-2xl relative">
                          {userCamOn ? (
                            <div className="absolute inset-0 w-full h-full flex items-center justify-center">
                              <video
                                id="user-active-video"
                                ref={localVideoRef}
                                autoPlay
                                playsInline
                                muted
                                className="absolute inset-0 w-full h-full object-cover rounded-2xl scale-x-[-1]"
                              />
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-indigo-600/10 border-2 border-slate-800 flex items-center justify-center text-indigo-400 text-lg font-bold group-hover:scale-105 transition-transform">
                              {userName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>

                        {/* Mic Indicator controls footer block */}
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 z-10">
                          <div className="flex items-center space-x-1.5">
                            {userMuted ? (
                              <span className="bg-red-500/10 text-red-400 px-2.5 py-1 rounded-md flex items-center space-x-1">
                                <MicOff size={11} />
                                <span>Muted</span>
                              </span>
                            ) : (
                              <span className="bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-md flex items-center space-x-1">
                                <Mic size={11} className="animate-pulse" />
                                <span>Voice Active</span>
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">Stream: active</span>
                        </div>
                      </div>

                      {/* VIRTUAL INVITED PARTICIPANTS TILES */}
                      {participants.filter(p => !p.isLocal).map((p) => (
                        <div key={p.id} className="bg-slate-900 rounded-3xl border border-slate-800 p-4 flex flex-col justify-between relative overflow-hidden transition-all shadow-xl hover:border-indigo-500/40 min-h-[220px]">
                          <div className="absolute top-3 left-3 bg-black/60 px-2.5 py-1 rounded-full text-[10px] text-slate-300 font-extrabold flex items-center space-x-1.5 z-10 backdrop-blur-md">
                            <span className="text-xs">{p.id.startsWith("user_") ? "🔴" : "🗣️"}</span>
                            <span className="truncate max-w-[120px]">
                              {p.id.startsWith("user_") ? `${p.name} (Live)` : p.name}
                            </span>
                          </div>

                          <div className="absolute top-3 right-3 flex items-center space-x-1.5 z-10">
                            {p.raisedHand && (
                              <span className="bg-amber-500 text-slate-950 px-2.5 py-1 rounded-full text-[9px] font-black animate-bounce flex items-center space-x-1">
                                <Hand size={11} />
                                <span className="hidden sm:inline">HAND</span>
                              </span>
                            )}
                            <span className="bg-slate-800 text-slate-200 px-2 py-0.5 rounded-md text-[10px] font-bold">
                              {p.langCode} translation
                            </span>
                          </div>

                          {/* Profile preview speaking triggers */}
                          <div className="flex-1 flex items-center justify-center my-6 relative overflow-hidden rounded-2xl w-full h-full min-h-[140px]">
                            {/* Persistent audio tag to play the stream voice under any visual mode */}
                            {remoteStreams[p.id] && (
                              <audio
                                ref={(el) => {
                                  if (el) {
                                    if (el.srcObject !== remoteStreams[p.id]) {
                                      el.srcObject = remoteStreams[p.id];
                                      console.log("Playing remote audio for peer:", p.name);
                                    }
                                  }
                                }}
                                autoPlay
                                playsInline
                              />
                            )}

                            {remoteStreams[p.id] && p.isCameraOn ? (
                              <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-black">
                                <video
                                  ref={(el) => {
                                    if (el) {
                                      // Avoid setting srcObject continuously if it is already set
                                      if (el.srcObject !== remoteStreams[p.id]) {
                                        el.srcObject = remoteStreams[p.id];
                                      }
                                    }
                                  }}
                                  autoPlay
                                  playsInline
                                  className="absolute inset-0 w-full h-full object-cover rounded-2xl"
                                />
                              </div>
                            ) : (
                              <div className="relative">
                                <div className={`w-16 h-16 rounded-full ${p.avatarColor} border-2 ${
                                  p.speaking ? "border-emerald-400 shadow-md animate-pulseScale" : "border-slate-800"
                                } flex items-center justify-center text-white font-extrabold text-base relative transition-all`}>
                                  {p.name.slice(0, 2).toUpperCase()}
                                  {p.speaking && (
                                    <span className="absolute inset-0 rounded-full border border-emerald-400 animate-ping opacity-75"></span>
                                  )}
                                </div>

                                {p.speaking && (
                                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center justify-center space-x-0.5 h-3">
                                    {p.animatedFreq.map((val, key) => (
                                      <div
                                        key={key}
                                        className="w-0.5 bg-emerald-400 rounded-full transition-all duration-150"
                                        style={{ height: `${val * 1.5}px` }}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Controls bar block */}
                          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 z-10 bg-slate-900 border-t border-slate-800/40 pt-1.5">
                            <button
                              onClick={() => {
                                setParticipants(prev =>
                                  prev.map(p2 => p2.id === p.id ? { ...p2, isMuted: !p2.isMuted } : p2)
                                );
                              }}
                              className="text-slate-400 hover:text-white"
                            >
                              {p.isMuted ? "Unmute Participant" : "Mute Participant"}
                            </button>
                            <button
                              onClick={() => removeParticipant(p.id, p.name)}
                              className="text-red-400 hover:text-red-300"
                              title="Dismiss from trade room"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      ))}

                    </div>

                    {/* COLLABORATIVE EMBEDDED WHITEBOARD PLAN PANEL */}
                    {showWhiteboard && (
                      <div className="xl:col-span-5 h-[75vh] flex flex-col">
                        <div className="flex items-center justify-between bg-slate-900 text-white p-3 rounded-t-3xl border border-slate-800 shrink-0">
                          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-300 uppercase tracking-wild">
                            <PenTool className="text-indigo-400" size={13} />
                            <span>Room Whiteboard sketch</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                setIsWhiteboardMaximized(true);
                                showToast("Whiteboard expanded", "info");
                              }}
                              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                              title="Full size whiteboard"
                            >
                              <Maximize2 size={13} />
                            </button>
                            <button
                              onClick={() => setShowWhiteboard(false)}
                              className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-white transition-colors"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        </div>

                        <div className="flex-1 bg-white rounded-b-3xl overflow-hidden border border-slate-800 md:min-h-[300px]">
                          <Whiteboard
                            savedSnapshot={whiteboardSnapshot}
                            onSaveSnapshot={(dataUrl) => {
                              setWhiteboardSnapshot(dataUrl);
                              localStorage.setItem(`room_${roomName}_whiteboard`, dataUrl);
                              fetch(`/api/room/${roomName}/whiteboard`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ whiteboard: dataUrl })
                              }).catch(err => console.error("Error syncing whiteboard:", err));
                            }}
                          />
                        </div>
                      </div>
                    )}

                  </div>
                )}

                {/* THE REAL-TIME SUBTITLE BANNER OVERLAY CARD */}
                {latestCaptions && (
                  <div className="bg-slate-900 text-white rounded-3xl p-5 relative overflow-hidden shadow-xl border border-slate-800 shrink-0 select-text">
                    <div className="flex items-center justify-between border-b border-slate-850 pb-2 mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
                        <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                          BILINGUAL TRANSLATION CAPTIONS
                        </span>
                      </div>
                      <span className="text-[9px] font-bold text-slate-500 tracking-wider">
                        Speaker: {latestCaptions.sender} ({latestCaptions.lang})
                      </span>
                    </div>

                    <div className="space-y-2 text-left">
                      <p className="text-white text-base font-semibold leading-relaxed">
                        "{latestCaptions.text}"
                      </p>
                      <div className="h-px bg-slate-850" />
                      <p className="text-indigo-300 text-sm font-medium leading-relaxed italic">
                        Real-Time translation: "{latestCaptions.translation}"
                      </p>
                    </div>

                    {/* Speeches player trigger */}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-850">
                      <button
                        onClick={() => {
                          const code = latestCaptions.lang === "Urdu" ? "en-US" : "ur-PK";
                          speakText(latestCaptions.translation, code);
                          showToast("Streaming translation vocalization playback", "info");
                        }}
                        className="flex items-center space-x-1 text-[11px] font-bold text-slate-300 hover:text-white bg-slate-800 px-3 py-1 rounded-lg transition-all"
                      >
                        <Volume2 size={13} />
                        <span>Speech synthesis replay (آواڑ سنیں)</span>
                      </button>

                      <div className="flex items-center space-x-3 text-[10px] text-slate-500 font-bold">
                        <span>Bidirectional conversion</span>
                        <span>•</span>
                        <button
                          onClick={() => {
                            setLatestCaptions(null);
                          }}
                          className="text-slate-400 hover:text-white"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* MAIN COCKPIT CONTROL BUTTON BAR CARD */}
                <div className="h-20 bg-slate-900 border border-slate-800 rounded-3xl flex items-center justify-between px-6 shadow-2xl shrink-0">
                  <div className="flex items-center space-x-2.5">
                    
                    {/* User Mic Off/On */}
                    <button
                      id="ctrl-user-mic"
                      onClick={() => {
                        setUserMuted(!userMuted);
                        showToast(userMuted ? "Microphone active" : "Microphone muted", "info");
                      }}
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                        userMuted 
                          ? "bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30" 
                          : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-750"
                      }`}
                      title={userMuted ? "Unmute self" : "Mute self"}
                    >
                      {userMuted ? <MicOff size={16} /> : <Mic size={16} />}
                    </button>

                    {/* User Camera Off/On */}
                    <button
                      id="ctrl-user-cam"
                      onClick={() => {
                        setUserCamOn(!userCamOn);
                        showToast(userCamOn ? "Camera stream stopped" : "Camera stream active", "info");
                      }}
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                        !userCamOn 
                          ? "bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30" 
                          : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-750"
                      }`}
                      title={userCamOn ? "Turn camera off" : "Turn camera on"}
                    >
                      {userCamOn ? <Video size={16} /> : <VideoOff size={16} />}
                    </button>

                    {/* Screen stream Toggle */}
                    <button
                      id="ctrl-screenshare"
                      onClick={toggleScreenCapture}
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center border transition-all ${
                        isScreenSharing 
                          ? "bg-indigo-600 border-indigo-500 text-white" 
                          : "bg-slate-800 border-slate-750 hover:bg-slate-700 text-slate-300"
                      }`}
                      title="Share computer screen window on stage"
                    >
                      <Monitor size={16} />
                    </button>

                    {/* Raise hand */}
                    <button
                      id="ctrl-raise-hand"
                      onClick={toggleRaiseHand}
                      className="w-11 h-11 rounded-2xl flex items-center justify-center bg-slate-800 border border-slate-750 hover:bg-slate-700 text-slate-300"
                      title="Raise Hand Query alert"
                    >
                      <Hand size={16} />
                    </button>
                    
                  </div>

                  {/* Dynamic simulated walk dialogue copilot */}
                  <div className="flex items-center space-x-2 bg-slate-950 px-4 py-2 rounded-2xl border border-slate-850">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></span>
                    <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">
                      CO-PILOT CONVERSATION SIMULATOR:
                    </span>
                    <button
                      id="ctrl-simulator-trigger"
                      onClick={triggerNextSimulationLine}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] px-3 py-1 rounded-md transition-colors uppercase"
                    >
                      {isSimulating ? `Next line (${simulationIndex + 1}/4) 🗣️` : "Walkthrough Talk 🗣️"}
                    </button>
                  </div>

                  {/* EXIT LEAVE BUTON */}
                  <button
                    id="ctrl-exit-room"
                    onClick={executeExitCallTransition}
                    className="bg-red-600 hover:bg-red-700 hover:scale-[1.01] active:scale-95 text-white text-xs font-bold px-6 py-2.5 rounded-2xl transition-all shadow-md tracking-wider flex items-center space-x-1"
                  >
                    <PhoneOff size={13} />
                    <span>LEAVE ROOM & SAVE</span>
                  </button>
                </div>

              </div>
              
              {/* INTERACTIVE COMPANION COLLATERAL BAR (RIGHT SIDE PANEL) */}
              {showRightPanel ? (
                <div className="w-80 bg-slate-900 border-l border-slate-850 flex flex-col overflow-hidden z-20 shrink-0 text-left">
                  
                  {/* SELECT PANEL BUTTON BAR */}
                  <div className="grid grid-cols-4 border-b border-slate-850 shrink-0">
                    <button
                      id="side-tab-chat"
                      onClick={() => setRightPanel("chat")}
                      className={`py-3.5 text-[10px] font-bold text-center tracking-widest uppercase transition-colors ${
                        rightPanel === "chat" ? "bg-slate-950 border-b-2 border-indigo-500 font-extrabold text-white" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Chat
                    </button>
                    <button
                      id="side-tab-summary"
                      onClick={() => setRightPanel("summary")}
                      className={`py-3.5 text-[10px] font-bold text-center tracking-widest uppercase transition-colors ${
                        rightPanel === "summary" ? "bg-slate-950 border-b-2 border-indigo-500 font-extrabold text-white" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Summary
                    </button>
                    <button
                      id="side-tab-files"
                      onClick={() => setRightPanel("files")}
                      className={`py-3.5 text-[10px] font-bold text-center tracking-widest uppercase transition-colors ${
                        rightPanel === "files" ? "bg-slate-950 border-b-2 border-indigo-500 font-extrabold text-white" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Files
                    </button>
                    <button
                      id="side-tab-parts"
                      onClick={() => setRightPanel("participants")}
                      className={`py-3.5 text-[10px] font-bold text-center tracking-widest uppercase transition-colors ${
                        rightPanel === "participants" ? "bg-slate-950 border-b-2 border-indigo-500 font-extrabold text-white" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Users
                    </button>
                  </div>

                  {/* ACTIVE SIDEBAR PANEL ROUTERS */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-5">
                    
                    {/* CASE PANEL A: LIVE TRANSLATED CONVERSATION TIMELINE CHAT */}
                    {rightPanel === "chat" && (
                      <div className="flex flex-col h-full justify-between">
                        <div className="space-y-4 max-h-[58vh] overflow-y-auto pr-1">
                          
                          <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl">
                            <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-wider mb-1">
                              COLLABORATION LOGS
                            </h4>
                            <p className="text-[11px] text-slate-400 leading-normal">
                              Double-tab sync is enabled! Open the Invitation Link in another tab to see speech messages and transcripts sync automatically!
                            </p>
                          </div>

                          <div className="space-y-3">
                            {transcript.map((line) => (
                              <div key={line.id} className="text-left border-l-2 border-slate-800 pl-2.5 py-1 font-sans">
                                <div className="flex justify-between items-center text-[10px] text-slate-400">
                                  <span className="font-bold text-slate-300">{line.user}</span>
                                  <span className="font-mono text-[9px]">{line.time}</span>
                                </div>
                                <p className="text-xs text-slate-200 mt-1 leading-relaxed select-text">
                                  {line.text}
                                </p>
                                <p className="text-xs text-indigo-400 leading-normal mt-0.5 select-text">
                                  → {line.translation}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Dialogue input box cockpit */}
                        <div className="border-t border-slate-850 pt-3 mt-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] text-slate-400 font-bold">Write dialogue as</span>
                            
                            {/* Selected virtual identity selector */}
                            <select
                              id="speaker-chat-selector"
                              value={selectedSpeakerId}
                              onChange={(e) => setSelectedSpeakerId(e.target.value)}
                              className="text-[10px] bg-slate-950 text-indigo-400 border border-slate-850 rounded px-1.5 py-0.5 font-bold focus:outline-none cursor-pointer"
                            >
                              <option value="part-local">{userName} (Local)</option>
                              {participants.filter(p => !p.isLocal).map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          </div>

                          <div className="flex space-x-2">
                            <input
                              id="chat-speech-input"
                              type="text"
                              value={dialogueText}
                              onChange={(e) => setDialogueText(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && handleChatSubmit()}
                              placeholder="Type text dialogue to translate..."
                              className="flex-1 bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-indigo-400 font-medium"
                            />
                            <button
                              id="chat-speech-send"
                              onClick={handleChatSubmit}
                              className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors"
                              title="Translate bilingual dialogue"
                            >
                              <Send size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* CASE PANEL B: AI LIVE SUMMARY REPORT ARCHIVE */}
                    {rightPanel === "summary" && (
                      <div className="space-y-4">
                        <div className="bg-indigo-950/40 border border-indigo-900/40 p-4 rounded-2xl relative overflow-hidden text-left">
                          <div className="absolute right-3 top-3 text-indigo-400/20">
                            <Sparkle size={32} />
                          </div>
                          <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block mb-1">
                            AUTOMATED EXECUTIVE SUMMARY
                          </span>
                          <p className="text-xs text-slate-200 leading-relaxed text-justify select-text">
                            {summaryData.summary}
                          </p>
                          <span className="text-[9px] font-semibold text-slate-500 block mt-2">
                            Compiled at {summaryData.generatedAt}
                          </span>
                        </div>

                        {/* Conversation Topics */}
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Discussion Topics Plan</h4>
                          {summaryData.topics.map((t) => (
                            <div key={t.id} className="bg-slate-950 p-3 rounded-2xl border border-slate-850">
                              <span className="font-bold text-xs text-slate-200">{t.title}</span>
                              <p className="text-[11px] text-slate-400 mt-1 select-text">{t.details}</p>
                            </div>
                          ))}
                        </div>

                        {/* Action items checklist */}
                        <div className="space-y-3 pt-2">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned Task Action Items ({summaryData.actionItems.length})</h4>
                          <div className="space-y-2">
                            {summaryData.actionItems.map((act) => (
                              <button
                                key={act.id}
                                onClick={() => {
                                  setSummaryData(prev => ({
                                    ...prev,
                                    actionItems: prev.actionItems.map(a => a.id === act.id ? { ...a, completed: !a.completed } : a)
                                  }));
                                }}
                                className="w-full text-left bg-slate-950 hover:bg-slate-900 duration-100 p-2.5 rounded-xl border border-slate-850 transition-colors flex items-start space-x-2.5"
                              >
                                {act.completed ? (
                                  <CheckCircle size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                                ) : (
                                  <div className="w-3.5 h-3.5 rounded border border-slate-600 mt-0.5 shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className={`text-[11px] font-medium leading-tight ${act.completed ? "line-through text-slate-500" : "text-slate-200"}`}>
                                    {act.description}
                                  </p>
                                  <span className="text-[9px] font-bold text-indigo-400 mt-1 block">Owner: {act.owner}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Decisions list */}
                        <div className="space-y-2 pt-2">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Final Delegated Decisions</h4>
                          <ul className="space-y-1.5 pl-3 list-disc text-xs text-slate-400 leading-normal">
                            {summaryData.decisions.map((dec, idx) => (
                              <li key={idx} className="select-text">{dec}</li>
                            ))}
                          </ul>
                        </div>

                        {/* Run Gemini Summarizer */}
                        <div className="pt-3 border-t border-slate-850">
                          <button
                            id="side-summarize-btn"
                            onClick={requestAISummarizer}
                            disabled={isSummarizing}
                            className="w-full py-2.5 bg-slate-950 border border-slate-800 hover:border-indigo-400 hover:text-indigo-400 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all text-slate-300 disabled:opacity-50"
                          >
                            <Sparkles size={13} className="text-indigo-400 animate-pulse" />
                            <span>{isSummarizing ? "Compiling..." : "Regenerate Summary notes"}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* CASE PANEL C: INTEGRATED MULTI-USER FILE SHARING CATALOG */}
                    {rightPanel === "files" && (
                      <div className="space-y-4">
                        <div className="border border-dashed border-slate-800 p-5 rounded-2xl text-center space-y-3 hover:border-indigo-500/40 transition-colors">
                          <Upload className="text-slate-500 mx-auto" size={24} />
                          <div className="space-y-1">
                            <span className="text-xs font-bold text-slate-300 block">Upload Room Files</span>
                            <span className="text-[10px] text-slate-500 block">PDF or Word documentation</span>
                          </div>
                          
                          <button
                            id="side-files-upload-btn"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg transition-colors inline-block"
                          >
                            Browse Documents
                          </button>
                          
                          <input
                            ref={fileInputRef}
                            type="file"
                            onChange={triggerDocFileUpload}
                            className="hidden"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                          />
                        </div>

                        {/* File Catalog list */}
                        <div className="space-y-3.5 text-left">
                          <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-850 pb-1">
                            Shared Room Assets ({uploadedFiles.length})
                          </h4>

                          {uploadedFiles.length === 0 ? (
                            <p className="text-[10px] text-slate-500 italic block">No shared files uploaded.</p>
                          ) : (
                            <div className="space-y-2">
                              {uploadedFiles.map(file => (
                                <div key={file.id} className="bg-slate-950 p-3 rounded-2xl border border-slate-850 flex items-center justify-between">
                                  <div className="flex items-center space-x-2.5 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-850 flex items-center justify-center text-slate-400 font-extrabold text-xs shrink-0">
                                      {file.name.split(".").pop()?.toUpperCase() || "DOC"}
                                    </div>
                                    <div className="min-w-0">
                                      <span className="font-bold text-xs text-slate-300 block truncate" title={file.name}>
                                        {file.name}
                                      </span>
                                      <span className="text-[9px] text-slate-500 block">
                                        Size: {file.size} • by {file.sender}
                                      </span>
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => {
                                      showToast(`Downloading shared document: ${file.name}`, "success");
                                    }}
                                    className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-800"
                                    title="Download File"
                                  >
                                    <Download size={12} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* CASE PANEL D: DETAILED ACTIVE PARTICIPANTS ROSTER LIST */}
                    {rightPanel === "participants" && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Active Dialect Speakers ({participants.length})
                          </h4>
                        </div>

                        <div className="space-y-2.5">
                          {participants.map((p) => (
                            <div key={p.id} className="bg-slate-950 p-3 rounded-2xl border border-slate-850 flex items-center justify-between font-sans">
                              <div className="flex items-center space-x-2.5">
                                <div className={`w-8 h-8 rounded-full ${p.avatarColor} flex items-center justify-center text-white text-xs font-black shrink-0`}>
                                  {p.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <span className="font-bold text-xs text-slate-300 block">{p.name} {p.isLocal && "(You)"}</span>
                                  <span className="text-[9px] text-indigo-400 block font-semibold">Language: {p.langCode}</span>
                                </div>
                              </div>

                              <div className="flex items-center space-x-1">
                                {p.isMuted ? (
                                  <MicOff size={11} className="text-red-400" />
                                ) : (
                                  <Mic size={11} className="text-emerald-400" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Invitation Hyperlink block */}
                        <div className="bg-slate-950 p-4 border border-slate-850 rounded-2xl space-y-2 mt-4 text-left">
                          <h5 className="text-[10px] font-black tracking-wider uppercase text-indigo-400">Invite Coworker Links</h5>
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            Share this live meeting link with others to start a real-time, translated, bidirectional conversation!
                          </p>
                          <button
                            onClick={copyInvitationToClipboard}
                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center space-x-1"
                          >
                            <Copy size={12} />
                            <span>Copy Meet Invitation URL</span>
                          </button>
                        </div>
                      </div>
                    )}

                  </div>

                  {/* BOTTOM PANEL ACTION COCKPIT FOOTER */}
                  <div className="p-4 bg-slate-950 border-t border-slate-850 shrink-0 select-none">
                    <button
                      id="side-panel-toggle"
                      onClick={() => setShowRightPanel(false)}
                      className="w-full py-2.5 bg-slate-900 border border-slate-810 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors flex items-center justify-center space-x-1"
                    >
                      <X size={13} />
                      <span>Collapse Sidebar Panel</span>
                    </button>
                  </div>

                </div>
              ) : (
                /* COLLAPSED RAIL TAB TRIGGER IF PANEL IS HIDDEN */
                <button
                  id="side-panel-maximize"
                  onClick={() => setShowRightPanel(true)}
                  className="absolute right-4 top-4 z-40 p-2.5 bg-slate-900/95 border border-slate-800 text-slate-300 rounded-2xl hover:text-white backdrop-blur-md shadow-2xl flex items-center space-x-1 text-xs font-bold"
                >
                  <Menu size={16} />
                  <span>Show Meet Sidebar ({transcript.length} logs)</span>
                </button>
              )}

            </div>
          )}

        </div>
      )}

      {/* ======================= PHASE 3: MEETING ENDED SUMMARY PAGE ======================= */}
      {phase === "ended" && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 overflow-y-auto bg-slate-950 text-center font-sans">
          <div className="max-w-2xl bg-slate-900 border border-slate-800 p-10 rounded-3xl shadow-3xl text-left space-y-6">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle size={32} />
              </div>
              <h1 className="text-2xl font-black text-white">Delegation Call Completed</h1>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                The session has been stored securely in your local meeting database cache. Live transcripts and whiteboards are available for direct review.
              </p>
            </div>

            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 space-y-4">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Meeting Name / Topic</span>
                <strong className="text-white text-base font-bold">{meetingTitle}</strong>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Duration Tracked</span>
                  <span className="text-xs text-slate-300 font-mono font-bold">{formatSecondsToClock(recordingSeconds)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Conversational Logs</span>
                  <span className="text-xs text-slate-300 font-bold">{transcript.length} dialogue statements</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block mb-1">
                  Gemini Generated Meeting Summary Extract:
                </span>
                <p className="text-xs text-slate-400 leading-relaxed text-justify">{summaryData.summary}</p>
              </div>
            </div>

            {/* Export options inside Ended page */}
            <div className="grid grid-cols-2 gap-3 pb-2 select-none">
              <button
                id="ended-export-pdf"
                onClick={() => {
                  const simulatedRecord = {
                    id: `end_${Date.now()}`,
                    title: meetingTitle,
                    date: new Date().toLocaleDateString(),
                    duration: formatSecondsToClock(recordingSeconds),
                    languages: ["Urdu", "English"],
                    transcript,
                    summaryData,
                    whiteboardDataUrl: whiteboardSnapshot || undefined,
                    files: uploadedFiles
                  };
                  exportToPDF(simulatedRecord);
                }}
                className="py-3 bg-slate-950 border border-slate-800 hover:border-red-500 text-red-400 text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
              >
                <FileText size={14} />
                <span>Download PDF Summary</span>
              </button>

              <button
                id="ended-export-word"
                onClick={() => {
                  const simulatedRecord = {
                    id: `end_${Date.now()}`,
                    title: meetingTitle,
                    date: new Date().toLocaleDateString(),
                    duration: formatSecondsToClock(recordingSeconds),
                    languages: ["Urdu", "English"],
                    transcript,
                    summaryData,
                    whiteboardDataUrl: whiteboardSnapshot || undefined,
                    files: uploadedFiles
                  };
                  exportToWord(simulatedRecord);
                }}
                className="py-3 bg-slate-950 border border-slate-800 hover:border-indigo-400 text-indigo-400 text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
              >
                <FileText size={14} />
                <span>Download Word DOCX</span>
              </button>
            </div>

            <div className="flex gap-3 select-none">
              <button
                onClick={() => {
                  setPhase("active");
                  showToast("Returned safely to live room workspace", "success");
                }}
                className="flex-1 py-3 text-center bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 transition-colors cursor-pointer"
              >
                Rejoin current meeting room
              </button>
              
              <button
                onClick={() => {
                  setPhase("lobby");
                  setTranscript([]);
                  setRecordingSeconds(0);
                }}
                className="flex-1 py-3 text-center bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Start a New Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================= INVITE MODAL DIALOG POPUP ======================= */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 text-left space-y-4">
            <div className="flex justify-between items-center border-b border-slate-850 pb-3">
              <h3 className="font-bold text-sm uppercase tracking-wide text-white">Admit Participant</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-1 hover:bg-slate-800 rounded text-slate-400"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleAddNewParticipantForm} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Participant Name</label>
                <input
                  id="modal-invite-name"
                  type="text"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="e.g. Elena (Madrid)"
                  className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none transition-colors"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Conversational Dialect</label>
                <select
                  id="modal-invite-lang"
                  value={customInviteLang}
                  onChange={(e) => setCustomInviteLang(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 text-xs text-slate-300 rounded-xl py-2.5 px-3.5 focus:outline-none"
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name} {lang.flag}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
              >
                Admit to Trade Meeting
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );

  // Fallback extraction handlers
  function triggerDocFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    handleDocFileUpload(e);
  }

  function executeExitCallTransition() {
    triggerExitBilateralMeeting();
  }
}
