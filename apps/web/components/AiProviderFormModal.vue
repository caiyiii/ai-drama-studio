<template>
  <AppModal
    :open="open"
    :title="editing ? '编辑 AI Provider' : '添加 AI Provider'"
    :description="editing ? '更新连接信息。留空 API Key 表示保持原密钥。' : '测试成功后才能保存。API Key 仅保存在服务端。'"
    @close="$emit('close')"
  >
    <form class="space-y-3" @submit.prevent="onSave">
      <label class="block text-sm">
        <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">名称</span>
        <input
          v-model="form.name"
          required
          maxlength="80"
          class="mt-2 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-sm outline-none ring-gold-400/40 placeholder:text-zinc-600 focus:ring-2"
          placeholder="我的 DeepSeek"
        />
      </label>
      <label class="block text-sm">
        <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">Provider 类型</span>
        <StudioSelect
          v-model="form.provider"
          class="mt-2"
          :options="kindOptions"
        />
      </label>
      <label v-if="!isFal" class="block text-sm">
        <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">Base URL</span>
        <input
          v-model="form.baseUrl"
          required
          class="mt-2 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-sm outline-none ring-gold-400/40 placeholder:text-zinc-600 focus:ring-2"
          placeholder="https://api.deepseek.com"
        />
      </label>
      <p v-else class="text-xs text-zinc-500">
        FAL.ai 使用官方 Queue API（{{ falDefaultBaseUrl }}），无需填写 OpenAI 风格 Base URL。
      </p>
      <label class="block text-sm">
        <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">API Key</span>
        <input
          v-model="form.apiKey"
          :required="!editing"
          type="password"
          autocomplete="off"
          class="mt-2 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-sm outline-none ring-gold-400/40 placeholder:text-zinc-600 focus:ring-2"
          :placeholder="editing ? '••••••••••••••' : isFal ? 'FAL_KEY' : 'sk-…'"
        />
      </label>
      <label class="block text-sm">
        <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">Model</span>
        <input
          v-model="form.model"
          required
          class="mt-2 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-sm outline-none ring-gold-400/40 placeholder:text-zinc-600 focus:ring-2"
          :placeholder="isFal ? 'fal-ai/flux/schnell' : 'deepseek-chat'"
        />
      </label>
      <div>
        <p class="text-xs uppercase tracking-[0.16em] text-zinc-500">Capabilities</p>
        <div class="mt-2 space-y-2">
          <template v-if="!isFal">
            <StudioCheckbox v-model="form.chat" label="Chat" />
            <StudioCheckbox v-model="form.structured" label="Structured Output" />
          </template>
          <StudioCheckbox v-model="form.image" label="Image" />
          <StudioCheckbox v-model="form.video" label="Video" />
          <StudioCheckbox v-model="form.imageToVideo" label="Image to Video" />
          <template v-if="!isFal">
            <StudioCheckbox v-model="form.tts" label="TTS" />
            <StudioCheckbox v-model="form.music" label="Music" />
            <StudioCheckbox v-model="form.sfx" label="SFX" />
          </template>
          <p v-if="isFal" class="text-xs text-zinc-600">
            FAL.ai 本阶段支持 Image / Video / Image-to-Video。测试连接会发起一次最小图片生成请求。
          </p>
          <p v-else class="text-xs text-zinc-600">Voice Clone 仍为架构预留（Coming Soon）。</p>
          <p v-if="!isFal" class="text-xs text-zinc-600">测试连接走 Chat Completions。纯图片 / 视频 / 语音 / 音乐 / 音效 Provider 可保存后在工作台验证生成。</p>
        </div>
      </div>
      <StudioCheckbox v-model="form.isDefault" label="设为默认" />

      <p v-if="localError" class="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
        {{ localError }}
      </p>
      <p v-if="testOk" class="text-sm text-emerald-300">连接成功，可以保存。</p>
      <p v-else-if="verifiedMismatch" class="text-sm text-zinc-500">
        配置已更改，请重新测试连接后再保存。
      </p>

      <div class="flex justify-end gap-2 pt-2">
        <button type="button" class="text-sm text-zinc-400" @click="$emit('close')">取消</button>
        <button
          type="button"
          :disabled="store.testing || !canTest"
          class="rounded-xl border border-white/10 px-4 py-2 text-sm disabled:opacity-40"
          @click="onTest"
        >
          {{ store.testing ? "测试中…" : "测试连接" }}
        </button>
        <button
          type="submit"
          :disabled="store.saving || !canSave"
          :title="saveHint"
          class="rounded-xl bg-gold-400 px-4 py-2 text-sm font-medium text-ink-950 disabled:opacity-40"
        >
          {{ store.saving ? "保存中…" : "保存" }}
        </button>
      </div>
    </form>
  </AppModal>
</template>

<script setup lang="ts">
import {
  AIProviderKind,
  AI_PROVIDER_KIND_LABELS,
  AiCapability,
  FAL_DEFAULT_BASE_URL,
  SUPPORTED_AI_PROVIDER_KINDS,
  type AIProvider,
} from "@ai-drama-studio/types";
import { useAiProviderStore } from "~/stores/ai-provider";

const props = defineProps<{
  open: boolean;
  editing?: AIProvider | null;
}>();

const emit = defineEmits<{
  close: [];
  saved: [];
}>();

const store = useAiProviderStore();
const supported = SUPPORTED_AI_PROVIDER_KINDS;
const falDefaultBaseUrl = FAL_DEFAULT_BASE_URL;

const form = reactive({
  name: "",
  provider: AIProviderKind.OPENAI_COMPATIBLE as string,
  baseUrl: "",
  apiKey: "",
  model: "",
  isDefault: false,
  chat: true,
  structured: true,
  image: false,
  video: false,
  imageToVideo: false,
  tts: false,
  music: false,
  sfx: false,
});
const verifiedSnapshot = ref<string | null>(null);
const testOk = ref(false);
const localError = ref<string | null>(null);

const isFal = computed(() => form.provider === AIProviderKind.FAL);

const kindOptions = Object.values(AIProviderKind).map((kind) => ({
  value: kind,
  label: `${AI_PROVIDER_KIND_LABELS[kind]}${supported.includes(kind) ? "" : "（即将支持）"}`,
  disabled: !supported.includes(kind),
}));

function effectiveBaseUrl() {
  if (isFal.value) {
    return form.baseUrl.trim() || FAL_DEFAULT_BASE_URL;
  }
  return form.baseUrl.trim();
}

function connectionSnapshot() {
  return JSON.stringify({
    provider: form.provider,
    baseUrl: effectiveBaseUrl(),
    model: form.model.trim(),
    apiKey: form.apiKey.trim() || (props.editing ? "__kept__" : ""),
  });
}

const canTest = computed(
  () =>
    Boolean(form.model.trim() && (isFal.value || form.baseUrl.trim())) &&
    (Boolean(form.apiKey.trim()) || Boolean(props.editing?.hasApiKey)),
);

const canSave = computed(() => {
  if (!form.name.trim() || !form.model.trim()) {
    return false;
  }
  if (!isFal.value && !form.baseUrl.trim()) {
    return false;
  }
  if (!props.editing && !form.apiKey.trim()) {
    return false;
  }
  if (mediaOnly.value) {
    return true;
  }
  return verifiedSnapshot.value === connectionSnapshot();
});

const mediaOnly = computed(
  () =>
    (form.image || form.video || form.imageToVideo || form.tts || form.music || form.sfx) &&
    !form.chat &&
    !form.structured,
);

const verifiedMismatch = computed(
  () => Boolean(verifiedSnapshot.value) && verifiedSnapshot.value !== connectionSnapshot(),
);

const saveHint = computed(() => {
  if (canSave.value) {
    return "";
  }
  if (!form.name.trim()) {
    return "请填写名称";
  }
  if (mediaOnly.value) {
    return "";
  }
  return "请先测试连接成功后再保存";
});

watch(
  () => props.open,
  (open) => {
    if (!open) {
      return;
    }
    const editing = props.editing;
    localError.value = null;
    testOk.value = false;
    form.name = editing?.name ?? "";
    form.provider = editing?.provider ?? AIProviderKind.OPENAI_COMPATIBLE;
    form.baseUrl = editing?.baseUrl ?? "";
    form.apiKey = "";
    form.model = editing?.model ?? "";
    form.isDefault = editing?.isDefault ?? false;
    if ((editing?.provider ?? AIProviderKind.OPENAI_COMPATIBLE) === AIProviderKind.FAL) {
      form.chat = false;
      form.structured = false;
      form.image = editing?.capabilities?.includes(AiCapability.IMAGE) ?? true;
      form.video = editing?.capabilities?.includes(AiCapability.VIDEO) ?? false;
      form.imageToVideo =
        editing?.capabilities?.includes(AiCapability.IMAGE_TO_VIDEO) ?? false;
      form.tts = false;
      form.music = false;
      form.sfx = false;
      if (!form.baseUrl) form.baseUrl = FAL_DEFAULT_BASE_URL;
    } else {
      form.chat = editing?.capabilities?.includes(AiCapability.CHAT) ?? true;
      form.structured =
        editing?.capabilities?.includes(AiCapability.STRUCTURED_OUTPUT) ?? true;
      form.image = editing?.capabilities?.includes(AiCapability.IMAGE) ?? false;
      form.video = editing?.capabilities?.includes(AiCapability.VIDEO) ?? false;
      form.imageToVideo =
        editing?.capabilities?.includes(AiCapability.IMAGE_TO_VIDEO) ?? false;
      form.tts = editing?.capabilities?.includes(AiCapability.TTS) ?? false;
      form.music = editing?.capabilities?.includes(AiCapability.MUSIC) ?? false;
      form.sfx = editing?.capabilities?.includes(AiCapability.SFX) ?? false;
    }
    verifiedSnapshot.value = editing ? connectionSnapshot() : null;
  },
);

watch(
  () => form.provider,
  (kind) => {
    if (kind === AIProviderKind.FAL) {
      form.chat = false;
      form.structured = false;
      form.tts = false;
      form.music = false;
      form.sfx = false;
      if (!form.image && !form.video && !form.imageToVideo) {
        form.image = true;
      }
      if (!form.baseUrl.trim()) {
        form.baseUrl = FAL_DEFAULT_BASE_URL;
      }
      if (!form.model.trim()) {
        form.model = "fal-ai/flux/schnell";
      }
    }
  },
);

watch(
  () => connectionSnapshot(),
  (current) => {
    testOk.value = Boolean(verifiedSnapshot.value) && verifiedSnapshot.value === current;
  },
);

async function onTest() {
  localError.value = null;
  testOk.value = false;
  if (props.editing && !form.apiKey.trim()) {
    const result = await store.testProvider(props.editing.id);
    if (result.success) {
      verifiedSnapshot.value = connectionSnapshot();
      testOk.value = true;
    } else {
      verifiedSnapshot.value = null;
      localError.value = result.message || "测试连接失败";
    }
    return;
  }
  const result = await store.testProviderConfig({
    provider: form.provider as AIProviderKind,
    baseUrl: effectiveBaseUrl(),
    apiKey: form.apiKey.trim(),
    model: form.model.trim(),
  });
  if (result.success) {
    verifiedSnapshot.value = connectionSnapshot();
    testOk.value = true;
    return;
  }
  verifiedSnapshot.value = null;
  localError.value = result.message || "测试连接失败";
}

async function onSave() {
  if (!canSave.value) {
    localError.value = saveHint.value || "请先测试连接成功后再保存。";
    return;
  }
  if (!form.chat && !form.structured && !form.image && !form.video && !form.imageToVideo && !form.tts && !form.music && !form.sfx) {
    localError.value = "请至少选择一项能力。";
    return;
  }
  const capabilities = [
    ...(form.chat ? [AiCapability.CHAT] : []),
    ...(form.structured ? [AiCapability.STRUCTURED_OUTPUT] : []),
    ...(form.image ? [AiCapability.IMAGE] : []),
    ...(form.video ? [AiCapability.VIDEO] : []),
    ...(form.imageToVideo ? [AiCapability.IMAGE_TO_VIDEO] : []),
    ...(form.tts ? [AiCapability.TTS] : []),
    ...(form.music ? [AiCapability.MUSIC] : []),
    ...(form.sfx ? [AiCapability.SFX] : []),
  ];
  localError.value = null;
  if (props.editing) {
    const updated = await store.updateProvider(props.editing.id, {
      name: form.name.trim(),
      provider: form.provider as AIProviderKind,
      baseUrl: effectiveBaseUrl(),
      model: form.model.trim(),
      isDefault: form.isDefault,
      capabilities,
      ...(form.apiKey.trim() ? { apiKey: form.apiKey.trim() } : {}),
    });
    if (updated) {
      emit("saved");
      emit("close");
    } else {
      localError.value = store.error;
    }
    return;
  }
  const created = await store.createProvider({
    name: form.name.trim(),
    provider: form.provider as AIProviderKind,
    baseUrl: effectiveBaseUrl(),
    apiKey: form.apiKey.trim(),
    model: form.model.trim(),
    isDefault: form.isDefault,
    capabilities,
  });
  if (created) {
    emit("saved");
    emit("close");
  } else {
    localError.value = store.error;
  }
}
</script>
