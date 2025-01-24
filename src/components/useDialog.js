import { ref } from 'vue'

export default function useDialog() {
    const dialog = ref(false)
    const open = () => { dialog.value = true }
    const close = () => { dialog.value = false }

    return {
        dialog,
        open,
        close,
    }
}