<template>
  <div class="attention-label-wrapper" :style="wrapperStyles">
    <div
      class="attention-label"
      :class="[bgColorClass, textColorClass]"
      :style="labelStyles"
    >
      <slot>{{ a_message }}</slot>
    </div>
  </div>
</template>

<script>

export default {
  name: 'AttentionLabel',
  props: {
    message: {
      type: String,
      default: 'Junk Mail (default)'
    },
    bgColorClass: {
      type: String,
      default: 'bg-primary'
    },
    textColorClass: {
      type: String,
      default: 'text-white'
    },
    offsetX: {
      type: String,
      default: '0px'
    },
    offsetY: {
      type: String,
      default: '0px'
    },
    customStyles: {
      type: Object,
      default: () => ({})
    },

    // Built in messages
    newAndImproved:     { type: Boolean, default: false },
    limitedTimeOffer:   { type: Boolean, default: false },
    exclusiveFeature:   { type: Boolean, default: false },
    tryItNow:           { type: Boolean, default: false },
    dontMissOut:        { type: Boolean, default: false },
    comingSoon:         { type: Boolean, default: false }
  },

  data: () => {
    return {
      isDiag: false,
      isBuiltin: false,
      a_message: 'message undefined'
    }
  },

  computed: {
    wrapperStyles() {
      return {
        position: 'absolute',
        display: 'inline-block',
        ...this.customStyles
      };
    },
    labelStyles() {
      return {
        position: 'relative',
        top: this.offsetY,
        left: this.offsetX,
        whiteSpace: 'normal',
        wordWrap: 'break-word',
        textAlign: 'center'
      };
    }
  },

  mounted() {

    switch (true) {
      case this.newAndImproved:
        this.a_message = 'New & Improved!';
        this.isBuiltin = true;
        break;
      case this.limitedTimeOffer:
        this.a_message = 'Limited Time Offer!';
        this.isBuiltin = true;
        break;
      case this.exclusiveFeature:
        this.a_message = 'Exclusive Feature!';
        this.isBuiltin = true;
        break;
      case this.tryItNow:
        this.a_message = 'Try It Now!';
        this.isBuiltin = true;
        break;
      case this.dontMissOut:
        this.a_message = "Don't Miss Out!";
        this.isBuiltin = true;
        break;
      case this.comingSoon:
        this.a_message = 'Coming Soon!';
        this.isBuiltin = true;
        break;
    }

    if (this.message && !this.isBuiltin) {
      this.a_message = this.message;
    }
  }
}
</script>

<style scoped>

.attention-label-wrapper {
  display: inline-block;
  position: relative;
}

.attention-label {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0.5rem;
  border: 2px solid currentColor;
  border-radius: 50%; /* Ensures circular shape */
  font-weight: bold;
  text-align: center;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  clip-path: polygon(
    10% 0%, 90% 0%, 100% 10%, 100% 90%, 90% 100%, 10% 100%, 0% 90%, 0% 10%
  );
  width: 6rem; /* Reduced width to apply more pressure */
  height: 6rem; /* Reduced height to apply more pressure */
  line-height: 1.2;
  word-wrap: break-word;
  aspect-ratio: 1 / 1; /* Ensures width and height are always equal */
}
</style>