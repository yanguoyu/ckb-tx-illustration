import React, { useEffect, useMemo, useRef, useState } from "react";
import { config, Input, Output, RPC } from "@ckb-lumos/lumos";
import CytoscapeGraph, { TxData, truncateMiddle } from './cytoscape-graph'

export const TransactionIllustration: React.FC<{
  hash: string;
  isMainnet?: boolean;
  url?: string;
}> = ({ hash: txHash, isMainnet, url: inputUrl }) => {
  const [txData, setTxData] = useState<TxData>();

  const url = useMemo(() => {
    if (inputUrl) return inputUrl;
    if (isMainnet) return "https://mainnet.ckb.dev";
    return "https://testnet.ckb.dev";
  }, [inputUrl, isMainnet]);

  useEffect(() => {
    if (isMainnet) {
      config.initializeConfig(config.MAINNET)
    } else {
      config.initializeConfig(config.TESTNET)
    }
  }, [isMainnet])

  useEffect(() => {
    getTxData({ txHash, url }).then(setTxData);
  }, [txHash, url]);

  const ref = useRef<HTMLDivElement | null>(null)
  const [inputPositions, setInputsPositions] = useState<(cytoscape.BoundingBox12 & cytoscape.BoundingBoxWH)[]>([])

  useEffect(() => {
    if (ref.current && txData) {
      const cy = CytoscapeGraph(ref.current, txData)
      const inputsBox = txData.inputs.map(v => cy.getElementById(`${v.previousOutput.txHash}_${v.previousOutput.index}`).renderedBoundingBox())
      setInputsPositions(inputsBox)
    }
  }, [ref, txData, setInputsPositions])

  return (
    <div style={{ position: 'relative' }}>
      <div ref={ref} style={{ width: '100%', height: 400 }} />
      {
        txData?.inputs.map((v, idx) => (
          <div
            key={`${v.previousOutput.txHash}-${v.previousOutput.index}`}
            style={{ lineHeight: `${inputPositions[idx]?.h}px`, position: 'absolute', left: inputPositions[idx]?.x1 + 4, top: inputPositions[idx]?.y1 }}
          >
            <span style={{ color: '#00CC9B'}}>{truncateMiddle(v.previousOutput.txHash)}-{+v.previousOutput.index}</span>
            &nbsp;&nbsp;|&nbsp;&nbsp;
            <span>{BigInt(v.capacity).toString()}</span>
          </div>
        ))
      }
    </div>
  )
};

async function getTxData({
  url,
  txHash,
}: {
  url: string;
  txHash: string;
}): Promise<TxData> {
  const rpc = new RPC(url);
  const tx = await rpc.getTransaction(txHash);

  const outputs = tx.transaction.outputs.map<Output>((output, index) => ({
    ...output,
    data: tx.transaction.outputsData[index] || "0x",
  }));

  const inputsPromise = tx.transaction.inputs.map<Promise<Input & Output>>(
    async (input) => {
      const previousTxHash = input.previousOutput.txHash;
      const previousTx = await rpc.getTransaction(previousTxHash);

      const index = Number(input.previousOutput.index);
      const output = previousTx.transaction.outputs[index];
      const data = previousTx.transaction.outputsData[index] || "0x";

      return { ...output, data, ...input };
    },
  );

  const inputs = await Promise.all(inputsPromise);

  return { inputs, outputs, txHash };
}
