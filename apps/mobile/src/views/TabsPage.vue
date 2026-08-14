<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet />
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="home" href="/tabs/home">
          <ion-label>首页</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="projects" href="/tabs/projects">
          <ion-label>项目</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="tasks" href="/tabs/tasks">
          <ion-label>任务</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="assets" href="/tabs/assets">
          <ion-label>素材</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="me" href="/tabs/me">
          <ion-label>我的</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonLabel,
  IonPage,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
} from "@ionic/vue";
</script>
