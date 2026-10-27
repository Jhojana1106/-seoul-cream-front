/** Arma un enlace de WhatsApp. No envía el mensaje: abre el chat para que el personal pulse Enviar. */
export function whatsappChatUrl(phone: string, text: string): string | null {
  let digits = phone.replace(/\D/g, "")
  if (digits.startsWith("00")) digits = digits.slice(2)
  if (digits.startsWith("57") && digits.length === 12) {
    // ya trae el indicativo de Colombia
  } else if (digits.length === 10) {
    digits = `57${digits}`
  } else {
    return null
  }

  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

export function readyNotice(name: string, number: string, fulfillment?: string) {
  const where = fulfillment === "delivery"
    ? "ya está listo y sale para tu dirección"
    : "ya está listo para recoger"
  return `Hola ${name}, tu pedido ${number} de Seoul Cream ${where}.`
}
