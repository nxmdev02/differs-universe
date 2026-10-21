<template>
  <div class="observatory-frame" aria-hidden="true">
    <span class="frame-corner top-left" />
    <span class="frame-corner top-right" />
    <span class="frame-corner bottom-left" />
    <span class="frame-corner bottom-right" />
    <span class="field-ruler" />
    <span class="field-title">DEEP FIELD <i /> HOME IN SIGHT</span>
  </div>
</template>
<style scoped>
.observatory-frame {
  position: absolute;
  inset: 12px;
  pointer-events: none;
  color: var(--observatory-ink, #c8b48b);
  opacity: 0.42;
}
.frame-corner {
  position: absolute;
  width: 13px;
  height: 13px;
  border: 0 solid currentColor;
}
.top-left {
  top: 0;
  left: 0;
  border-top-width: 1px;
  border-left-width: 1px;
}
.top-right {
  top: 0;
  right: 0;
  border-top-width: 1px;
  border-right-width: 1px;
}
.bottom-left {
  bottom: 0;
  left: 0;
  border-bottom-width: 1px;
  border-left-width: 1px;
}
.bottom-right {
  bottom: 0;
  right: 0;
  border-bottom-width: 1px;
  border-right-width: 1px;
}
.field-ruler {
  position: absolute;
  right: 0;
  top: 40%;
  width: 5px;
  height: 20%;
  background: repeating-linear-gradient(to bottom, currentColor 0 1px, transparent 1px 12px);
  opacity: 0.55;
}
.field-title {
  position: absolute;
  right: 12px;
  top: 12px;
  font-size: 7px;
  letter-spacing: 2px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.field-title i {
  height: 1px;
  width: 20px;
  background: currentColor;
}
@media (max-width: 760px) {
  .field-title {
    display: none;
  }
  .observatory-frame {
    inset: 9px;
  }
}
</style>
