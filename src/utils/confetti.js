import confetti from 'canvas-confetti';

export function fireRedemptionConfetti() {
  try {
    // Colores fidely CLUB: terracota #9C382A, bisque #F5EBE1, dorado/arena
    const colors = ['#9C382A', '#852E21', '#F5EBE1', '#EADBD0', '#FFFFFF'];
    
    // Disparo central
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: colors,
      disableForReducedMotion: true
    });

    // Disparo lateral doble
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors
      });
    }, 200);
  } catch (e) {
    console.warn("Confetti effect unavailable", e);
  }
}
