**The specific animations for the login → dashboard loading transition:**

| Step | What happens                         | GSAP equivalent                                          |
| ---- | ------------------------------------ | -------------------------------------------------------- |
| 1    | Screen goes dark                     | `gsap.to('.screen', {opacity: 0})`                       |
| 2    | Diagonal blue stripe sweeps across   | `clip-path: polygon()` animated with `gsap.to`           |
| 3    | Large date/month slides in from left | `gsap.from('.date', {x: -200, opacity: 0})`              |
| 4    | Day labels cascade diagonally        | `gsap.from('.days', {y: 50, opacity: 0, stagger: 0.1})`  |
| 5    | Moon phase dots appear in sequence   | `gsap.from('.dots', {scale: 0, stagger: 0.05})`          |
| 6    | Active day pulses with ring          | `gsap.to('.ring', {scale: 1.2, repeat: -1, yoyo: true})` |
| 7    | Everything slides/fades out          | `gsap.to('.calendar', {x: 100, opacity: 0})`             |
| 8    | Dashboard content fades in           | `gsap.from('.dashboard', {opacity: 0})`                  |

The key CSS techniques: `transform: rotate(-30deg)` for the diagonal layout, `clip-path: polygon()` for the stripe shapes, `mix-blend-mode` for color overlays, and oversized `font-size` with `font-weight: 900` for the bold Persona typography.
