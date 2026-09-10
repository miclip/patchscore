/**
 * §3.9/#519. **The arithmetic the reference samples are made of, and nothing that reaches a
 * platform's own maths library.**
 *
 * Every function here is built from `+`, `-`, `*`, `/`, `Math.floor` and 32-bit bitwise operators.
 * That is a deliberate restriction and it is the whole reason this file exists rather than a
 * handful of `Math.sin` calls at the call sites.
 *
 * ## Why not `Math.sin`
 *
 * Invariant 6 is byte-identical output **on any platform**. ECMAScript pins `+`, `-`, `*`, `/` and
 * `Math.floor` to IEEE-754 double semantics with no extended precision and no contraction, so a
 * polynomial in those operators gives the same bits on every engine and every CPU. It says the
 * opposite about the transcendentals: `Math.sin`, `Math.exp` and `Math.pow` are
 * *implementation-approximated*, and an engine is free to call the system library. V8 ships its
 * own fdlibm port and is consistent across operating systems, which is why a Node-only generator
 * would appear to be fine. The moment these bytes are produced in a browser instead — which is
 * where #519's download is heading — a different engine's `sin` moves the last bit of a sample,
 * and a pinned hash becomes a claim that is true on one machine.
 *
 * So the transcendentals are written out. A rounding boundary can still be crossed by an
 * approximation, in principle; the difference is that here every implementation is *this* one.
 *
 * ## The accuracy this needs is not high
 *
 * The output is 16-bit. One LSB at full scale is about `3.05e-5`. The series below are accurate to
 * around `1e-9`, four orders of magnitude finer than the quantiser that follows them, so the
 * polynomial is not what limits the sound.
 */

/** Turns to radians. `sinTurns` takes turns, because a phase accumulator wrapping at 1 is exact. */
const TAU = 6.283185307179586

/** `log2(e)`, for expressing a natural exponential as the base-2 one implemented here. */
const LOG2E = 1.4426950408889634

/** `ln(2)`, for the reverse. */
const LN2 = 0.6931471805599453

/**
 * `sin(2πt)`, with `t` in turns.
 *
 * Turns rather than radians because an oscillator's phase accumulator then wraps with
 * `phase - Math.floor(phase)`, which is exact, instead of a subtraction of a rounded `2π` that
 * accumulates error over a long tail.
 *
 * Folded onto a quarter turn and evaluated as the Taylor series to `x^13`. Measured against
 * `Math.sin`, the largest absolute error is `6.6e-10`, which is one forty-thousandth of the 16-bit
 * LSB that follows it.
 */
export function sinTurns(t: number): number {
  let u = t - Math.floor(t)
  if (u > 0.5) u -= 1
  // sin(θ) = sin(π - θ) on the way up, and sin(θ) = sin(-π - θ) on the way down.
  if (u > 0.25) u = 0.5 - u
  else if (u < -0.25) u = -0.5 - u

  const x = u * TAU
  const x2 = x * x
  return (
    x *
    (1 +
      x2 *
        (-1 / 6 +
          x2 *
            (1 / 120 +
              x2 * (-1 / 5040 + x2 * (1 / 362880 + x2 * (-1 / 39916800 + x2 * (1 / 6227020800)))))))
  )
}

/** `cos(2πt)`. The same series, a quarter turn along. */
export function cosTurns(t: number): number {
  return sinTurns(t + 0.25)
}

/**
 * `2^x`.
 *
 * The integer part is applied by repeated multiplication by `2` or `0.5`, which is exact in binary
 * until the result goes subnormal; the fraction goes through the Taylor series for `e^y` with
 * `y = f·ln2 ∈ [0, 0.694)`. Measured against `Math.pow(2, x)` over `[-40, 10)`, the largest
 * relative error is `2.4e-10`.
 *
 * Clamped below at `-1000` so the loop is bounded whatever an envelope asks for. Anything that far
 * down is zero at 16 bits several hundred times over.
 */
export function exp2(x: number): number {
  const clamped = x < -1000 ? -1000 : x > 1000 ? 1000 : x
  const i = Math.floor(clamped)
  const y = (clamped - i) * LN2

  const frac =
    1 +
    y *
      (1 +
        y *
          (1 / 2 +
            y *
              (1 / 6 +
                y *
                  (1 / 24 +
                    y *
                      (1 / 120 +
                        y *
                          (1 / 720 +
                            y *
                              (1 / 5040 +
                                y * (1 / 40320 + y * (1 / 362880 + y * (1 / 3628800))))))))))

  let scale = 1
  for (let n = i; n > 0; n -= 1) scale *= 2
  for (let n = i; n < 0; n += 1) scale *= 0.5
  return frac * scale
}

/** `e^-x`, for `x >= 0`. What every decay in this file is written in terms of. */
export function expNeg(x: number): number {
  return exp2(-x * LOG2E)
}

/**
 * A white noise source, seeded.
 *
 * xorshift32: three shifts and three xors, all of them exact 32-bit integer operations, so the
 * sequence is identical on every engine. Invariant 7's ban on `Math.random` in the resolver is
 * about the same property, for the same reason — a sample library that is different every build
 * cannot have its bytes pinned.
 *
 * Returns `[-1, 1)`.
 */
export function noiseSource(seed: number): () => number {
  let s = seed >>> 0
  // Zero is xorshift's fixed point and would give silence. Any non-zero constant will do.
  if (s === 0) s = 0x9e3779b9
  return () => {
    s ^= s << 13
    s >>>= 0
    s ^= s >>> 17
    s ^= s << 5
    s >>>= 0
    return (s / 4294967296) * 2 - 1
  }
}

/**
 * The per-sample multiplier that takes an envelope down by 60 dB in `seconds`.
 *
 * Expressed as a time rather than as a coefficient so a recipe below reads in the units somebody
 * would say out loud. `1e-3` is -60 dB.
 */
export function decayPerSample(seconds: number, rate: number): number {
  if (seconds <= 0) return 0
  return expNeg(6.907755278982137 / (seconds * rate))
}

/**
 * A one-pole low-pass, as a stateful function of one sample.
 *
 * Six dB per octave, which is gentle. Cascade two where a recipe wants a slope you can hear.
 * Stable at every cutoff, which a two-pole state-variable filter is not near Nyquist, and the
 * hats here sit high enough for that to matter.
 */
export function lowPass(rate: number, cutoffHz: number): (x: number) => number {
  let y = 0
  const a = 1 - expNeg((TAU * cutoffHz) / rate)
  return (x: number) => {
    y += a * (x - y)
    return y
  }
}

/**
 * A one-pole high-pass, as the residue of the low-pass above.
 *
 * Also the thing that keeps DC out of a noise burst, which matters more than the tone: a file with
 * an offset in it peaks early, normalises quietly, and clicks on both ends.
 */
export function highPass(rate: number, cutoffHz: number): (x: number) => number {
  const lp = lowPass(rate, cutoffHz)
  return (x: number) => x - lp(x)
}

/**
 * A low-pass whose cutoff is given per sample. The swept filter under `riser` and `sweep`.
 *
 * The coefficient is recomputed each call rather than interpolated between endpoints, so a sweep's
 * shape is the shape its recipe asked for and not a straight line between two of its points.
 */
export function sweptLowPass(rate: number): (x: number, cutoffHz: number) => number {
  let y = 0
  return (x: number, cutoffHz: number) => {
    const a = 1 - expNeg((TAU * cutoffHz) / rate)
    y += a * (x - y)
    return y
  }
}

/**
 * Peak-normalise in place, to `targetPeak` in `[0, 1]`.
 *
 * Every reference file lands on the same peak, so a reader auditioning fourteen of them in a row
 * is comparing timbre rather than gain staging. A silent buffer is left alone: scaling it by
 * infinity is the one way this could produce a file of `NaN`.
 */
export function normalisePeak(samples: Float64Array, targetPeak: number): void {
  let peak = 0
  for (let i = 0; i < samples.length; i += 1) {
    const v = samples[i] as number
    const a = v < 0 ? -v : v
    if (a > peak) peak = a
  }
  if (peak === 0) return
  const g = targetPeak / peak
  for (let i = 0; i < samples.length; i += 1) {
    samples[i] = (samples[i] as number) * g
  }
}

/**
 * A linear fade over the last `seconds`, applied in place.
 *
 * A one-shot whose tail is still moving when the file ends clicks on every loop and on every pad
 * that retriggers it. The fade is short enough not to shorten the sound and long enough to reach
 * zero: the last sample of every file here is exactly `0`, which is what the test asserts rather
 * than the fade's length.
 */
export function fadeOut(samples: Float64Array, seconds: number, rate: number): void {
  const n = Math.floor(seconds * rate)
  if (n <= 0) return
  const start = samples.length - n
  for (let i = start < 0 ? 0 : start; i < samples.length; i += 1) {
    const remaining = samples.length - 1 - i
    samples[i] = (samples[i] as number) * (remaining / n)
  }
}
