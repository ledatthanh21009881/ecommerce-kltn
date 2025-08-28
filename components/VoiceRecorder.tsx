import React from 'react'
import { Button } from '@/components/ui/button'
import { Mic, Square, Pause, Play, Trash2 } from 'lucide-react'
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void
  onCancel: () => void
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onRecordingComplete,
  onCancel
}) => {
  const {
    isRecording,
    isPaused,
    recordingTime,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording
  } = useVoiceRecorder()

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleStartRecording = async () => {
    try {
      await startRecording()
    } catch (error) {
      console.error('Failed to start recording:', error)
    }
  }

  const handleStopRecording = async () => {
    try {
      const audioBlob = await stopRecording()
      if (audioBlob) {
        onRecordingComplete(audioBlob)
      }
    } catch (error) {
      console.error('Failed to stop recording:', error)
    }
  }

  const handleCancel = () => {
    resetRecording()
    onCancel()
  }

  return (
    <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
      {/* Recording indicator */}
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
        <span className="text-sm font-medium text-gray-700">
          {formatTime(recordingTime)}
        </span>
      </div>

      {/* Control buttons */}
      <div className="flex items-center gap-1">
        {!isRecording ? (
          <Button
            onClick={handleStartRecording}
            size="sm"
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            <Mic className="w-4 h-4" />
          </Button>
        ) : (
          <>
            {isPaused ? (
              <Button
                onClick={resumeRecording}
                size="sm"
                variant="outline"
              >
                <Play className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={pauseRecording}
                size="sm"
                variant="outline"
              >
                <Pause className="w-4 h-4" />
              </Button>
            )}
            
            <Button
              onClick={handleStopRecording}
              size="sm"
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              <Square className="w-4 h-4" />
            </Button>
          </>
        )}
        
        <Button
          onClick={handleCancel}
          size="sm"
          variant="ghost"
          className="text-gray-500 hover:text-red-500"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
