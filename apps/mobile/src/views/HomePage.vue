<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>AI Drama Studio</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <p class="eyebrow">Mobile First</p>
      <h1>在手机上浏览你的漫剧项目</h1>
      <p class="lead">
        完整创作在 Web / Desktop 完成。移动端用于查看项目与后续任务进度。
      </p>
      <ion-button expand="block" router-link="/tabs/projects">查看项目</ion-button>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from "@ionic/vue";
</script>

<style scoped>
.eyebrow {
  color: #d4af37;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  font-size: 11px;
}

h1 {
  font-size: 28px;
  line-height: 1.25;
  margin: 12px 0;
}

.lead {
  color: #a1a1aa;
  line-height: 1.6;
  margin-bottom: 24px;
}
</style>
