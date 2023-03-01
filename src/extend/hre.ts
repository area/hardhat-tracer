import { applyStateOverrides, getVM } from "../utils";
import { Decoder } from "../decoder";
import { extendEnvironment } from "hardhat/config";
import { TraceRecorder } from "../trace-recorder";
import { TracerEnv } from "../types";
import "hardhat/types/config";
import "hardhat/types/runtime";

declare module "hardhat/types/runtime" {
  interface HardhatRuntimeEnvironment {
    tracer: TracerEnv;
  }
}

extendEnvironment((hre) => {
  // copy reference of config.tracer to tracer
  // TODO take this properly, env can contain things that config does not need to.
  hre.tracer = hre.config.tracer;
  hre.tracer.decoder = new Decoder(hre.artifacts, hre.tracer._internal.cache);

  // @ts-ignore
  global.tracerEnv = hre.tracer;
  // @ts-ignore
  global.hreArtifacts = hre.artifacts;

  // trigger VM initialization
  hre.network.provider.send("eth_chainId", []).catch(() => {});

  // wait for VM to be initialized
  getVM(hre)
    .then(async (vm) => {
      hre.tracer.recorder = new TraceRecorder(vm, hre.tracer);
      if (hre.tracer.stateOverrides) {
        try {
          await applyStateOverrides(
            hre.tracer.stateOverrides,
            vm,
            hre.artifacts
          );
        } catch {}
      }
    })
    .catch(() => {
      // if for some reason we can't get the vm, disable hardhat-tracer
      hre.tracer.enabled = false;
    });
});
