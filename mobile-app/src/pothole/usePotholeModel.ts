import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { File, Paths } from "expo-file-system";
import { loadTensorflowModel, type TensorflowModelDelegate, type TfliteModel } from "react-native-fast-tflite";
import { useSettings } from "../hooks/useSettings";
import {
  confThresholdFromMetadata,
  defaultModelUrl,
  inspectModel,
  metadataUrlFor,
  type ModelLayout,
} from "./modelSource";

const DEFAULT_REPO = "Kettydee/AI-Assisted-AR-Helmet-Navigation-System";
const MODEL_FILE = "pothole.tflite";
const METADATA_FILE = "pothole_model_metadata.json";

/** GPU first; not every phone/model combination supports it, so CPU is the fallback. */
const ACCELERATED: TensorflowModelDelegate[] = Platform.OS === "ios" ? ["core-ml"] : ["android-gpu"];

export type PotholeModelState =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "downloading" }
  | {
      status: "ready";
      model: TfliteModel;
      layout: ModelLayout;
      confThreshold: number;
      accelerated: boolean;
    }
  | { status: "error"; message: string };

export function potholeModelUrl(custom: string | null): string {
  const repo = (Constants.expoConfig?.extra as { updateRepo?: string } | undefined)?.updateRepo ?? DEFAULT_REPO;
  return custom ?? defaultModelUrl(repo);
}

async function loadModel(uri: string): Promise<{ model: TfliteModel; accelerated: boolean }> {
  try {
    return { model: await loadTensorflowModel({ url: uri }, ACCELERATED), accelerated: true };
  } catch {
    return { model: await loadTensorflowModel({ url: uri }, []), accelerated: false };
  }
}

/**
 * The pothole detector model: downloaded once from `settings.potholeModelUrl`
 * (default: this repo's `pothole-model` release), cached in the app's
 * documents folder, and loaded into TFLite.
 */
export function usePotholeModel() {
  const { settings } = useSettings();
  const url = potholeModelUrl(settings.potholeModelUrl);
  const [state, setState] = useState<PotholeModelState>({ status: "loading" });
  const generation = useRef(0);

  const load = useCallback(async () => {
    const gen = ++generation.current;
    const set = (s: PotholeModelState) => {
      if (gen === generation.current) setState(s);
    };
    const file = new File(Paths.document, MODEL_FILE);
    if (!file.exists) {
      set({ status: "missing" });
      return;
    }
    set({ status: "loading" });
    try {
      const { model, accelerated } = await loadModel(file.uri);
      const checked = inspectModel(model.inputs, model.outputs);
      if (!checked.ok) {
        set({ status: "error", message: checked.reason });
        return;
      }
      const metadata = new File(Paths.document, METADATA_FILE);
      const confThreshold = confThresholdFromMetadata(metadata.exists ? await metadata.text() : null);
      set({ status: "ready", model, layout: checked.layout, confThreshold, accelerated });
    } catch (e) {
      set({ status: "error", message: `Couldn't load the model: ${(e as Error).message}` });
    }
  }, []);

  const download = useCallback(async () => {
    generation.current++;
    setState({ status: "downloading" });
    const file = new File(Paths.document, MODEL_FILE);
    const partial = new File(Paths.cache, `${MODEL_FILE}.part`);
    try {
      if (partial.exists) partial.delete();
      await File.downloadFileAsync(url, partial, { idempotent: true });
      if (file.exists) file.delete();
      partial.move(file);
    } catch (e) {
      setState({
        status: "error",
        message:
          `Couldn't download the model from ${url} (${(e as Error).message}). ` +
          "Train one and attach it to the pothole-model release - see POTHOLE_TRAINING.md.",
      });
      return;
    }
    // The calibrated threshold is optional: without it the detector uses 0.5.
    const metadata = new File(Paths.document, METADATA_FILE);
    try {
      await File.downloadFileAsync(metadataUrlFor(url), metadata, { idempotent: true });
    } catch {
      if (metadata.exists) metadata.delete();
    }
    await load();
  }, [url, load]);

  useEffect(() => {
    void load();
  }, [load]);

  return { state, url, download };
}
