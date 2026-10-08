<template>
  <!--
    12h — the native widget, restored exactly as these dialogs had it. The native
    input renders whatever the OS clock says, and for a 12h company that is
    already the right shape, so there is nothing here worth changing. This branch
    stays byte-for-byte the old markup on purpose: no clock slot (Chrome draws its
    own, and two clocks is worse than one), no `spellcheck` (meaningless on a
    non-text input).
  -->
  <q-input
    v-if="!is24h"
    :model-value="modelValue"
    type="time"
    outlined
    dense
    :disable="disable"
    :rules="rules"
    :autofocus="autofocus"
    class="dash-field form-field"
    hide-bottom-space
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template v-if="prependIcon" v-slot:prepend>
      <q-icon :name="prependIcon" size="xs" />
    </template>
  </q-input>

  <!--
    24h — `TimeField`, because no browser will draw 24h on request. `<input
    type="time">` follows the OS clock setting and nothing on the page can
    override it; asking for it via `lang` is Chromium issue 40326106 ("the
    browser locale is always used"), and a `timeformat` attribute is WHATWG issue
    #6698, still unimplemented. Hiding the AM/PM segment with CSS is not an
    option either — the hour field stays capped at 12 underneath, so an evening
    punch cannot be entered at all.

    `TimeField` is a dropdown per half — hour `00–23`, minute `00–59`, each one
    also typeable — rather than one list of whole `HH:mm` strings, because a
    single list means the minute can only be changed by picking a whole different
    time. That is the shape the old HR screen used.

    This component stays the place the format is decided, so the Add, inline-edit
    and Edit dialogs all get the same widget from one place: this branch.

    No `autofocus` is handed to the 24h branch: it opens on two boxes and focusing
    the hour the moment the dialog appears highlights it before the reader has
    chosen which half to touch. The 12h native input is a single control and keeps
    the autofocus it always had.
  -->
  <TimeField
    v-else
    :model-value="modelValue"
    :rules="rules"
    :prepend-icon="prependIcon"
    :disable="disable"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>

<script setup>
/**
 * A punch clock, printed the company's way.
 *
 * Two branches, because the two company formats genuinely cannot share one widget:
 *
 *   - **12h** keeps the native `<input type="time">` these dialogs always had. The
 *     browser's own control already speaks the company's format.
 *   - **24h** delegates to the shared `TimeField`, a dropdown per half — see the
 *     template for why the native control cannot be asked for 24h.
 *
 * This component is the single place the format is decided, so every attendance
 * dialog that renders it gets the same widget without knowing which format it is.
 *
 * Under both, `modelValue` is **always 24h `HH:mm`**, which is what every reader
 * downstream expects: `toUTC()` parses 24h, and `isOvernight` and `workingHours`
 * split on `:` as numbers. Nothing on the write path knows this component exists,
 * which is why the native branch can pass its value straight through.
 */
import { computed } from 'vue'
import TimeField from '@/components/common/TimeField.vue'

const props = defineProps({
  /** The canonical 24h `HH:mm` value, or '' when unset. */
  modelValue: { type: String, default: '' },
  /** The company's `time_format` — '12h' | '24h'. See useAdminLaborRuleSettings. */
  timeFormat: { type: String, default: '12h' },
  disable: { type: Boolean, default: false },
  rules: { type: Array, default: () => [] },
  /** The login/logout glyph the attendance dialogs put before a punch field. */
  prependIcon: { type: String, default: '' },
  autofocus: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const is24h = computed(() => props.timeFormat === '24h')
</script>
