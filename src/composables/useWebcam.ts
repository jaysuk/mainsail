import {
    mdiAlbum,
    mdiCampfire,
    mdiDoor,
    mdiRadiatorDisabled,
    mdiPrinter3d,
    mdiPrinter3dNozzle,
    mdiRaspberryPi,
    mdiWebcam,
} from '@mdi/js'
import { useBase } from '@/composables/useBase'
import { useServerStore } from '@/store/server'

/** Replaces the Vue 2 `WebcamMixin` class component. */
export function useWebcam() {
    const { hostUrl, hostPort } = useBase()
    const serverStore = useServerStore()

    const convertUrl = (baseUrl: string, printerUrl: string | null) => {
        let url = new URL(baseUrl, hostUrl.value.toString())

        if (printerUrl !== null) url = new URL(baseUrl, printerUrl)

        if (baseUrl.startsWith('http') || baseUrl.startsWith('://')) url = new URL(baseUrl)

        if (baseUrl.startsWith('/webcam')) {
            const ports = [80]
            ports.push((serverStore.config?.config?.server as { port?: number })?.port ?? 7125)
            ports.push((serverStore.config?.config?.server as { ssl_port?: number })?.ssl_port ?? 7130)

            if (!ports.includes(hostPort.value)) url.port = hostPort.value.toString()
        }

        return decodeURIComponent(url.toString())
    }

    const convertWebcamIcon = (iconName: string): string => {
        switch (iconName) {
            case 'mdiAlbum':
                return mdiAlbum
            case 'mdiCampfire':
                return mdiCampfire
            case 'mdiDoor':
                return mdiDoor
            case 'mdiRadiatorDisabled':
                return mdiRadiatorDisabled
            case 'mdiPrinter3d':
                return mdiPrinter3d
            case 'mdiPrinter3dNozzle':
                return mdiPrinter3dNozzle
            case 'mdiRaspberryPi':
                return mdiRaspberryPi

            default:
                return mdiWebcam
        }
    }

    const generateTransform = (flip_horizontal: boolean, flip_vertical: boolean, rotation: number, aspect_ratio = 1) => {
        const transforms = []
        if (flip_horizontal) transforms.push('scaleX(-1)')
        if (flip_vertical) transforms.push('scaleY(-1)')
        if (rotation != 0) {
            transforms.push(`rotate(${rotation}deg)`)

            if (aspect_ratio != 1 && rotation != 180) transforms.push(`scale(${1 / aspect_ratio})`)
        }

        if (transforms.length) return transforms.join(' ')

        return 'none'
    }

    const getWrapperStyle = (aspectRatio: number | null, rotation: number) => {
        if (aspectRatio == null || aspectRatio == 1 || rotation == 0 || rotation == 180) return {}

        if (aspectRatio < 1 && (rotation == 90 || rotation == 270)) {
            return { aspectRatio: 1 / aspectRatio }
        }

        return { aspectRatio: aspectRatio }
    }

    const updateAspectRatioFromVideo = (videoElement: HTMLVideoElement | null | undefined): number | null => {
        const w = videoElement?.videoWidth
        const h = videoElement?.videoHeight

        if (!w || !h) return null

        return w / h
    }

    const updateAspectRatioFromImage = (imageElement: HTMLImageElement | null | undefined): number | null => {
        const w = imageElement?.naturalWidth
        const h = imageElement?.naturalHeight

        if (!w || !h) return null

        return w / h
    }

    return {
        convertUrl,
        convertWebcamIcon,
        generateTransform,
        getWrapperStyle,
        updateAspectRatioFromVideo,
        updateAspectRatioFromImage,
    }
}
