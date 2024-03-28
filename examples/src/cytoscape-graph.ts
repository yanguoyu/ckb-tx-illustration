import cytoscape, { NodeSingular } from 'cytoscape'
import type { Hash, Input, Output } from '@ckb-lumos/lumos';

export type TxData = {
  inputs: (Input & Output)[]
  outputs: Output[]
  txHash: Hash
}

export function truncateMiddle(str: string, start = 6, end = start) {
  return `${str.slice(0, start)}...${str.slice(-end)}`;
}

export default function(container: HTMLElement, txData: TxData) {
  const gridRows = txData.inputs.length > txData.outputs.length ? txData.inputs.length : txData.outputs.length
  const cy = cytoscape({
    container,
    elements: [
      ...txData.inputs.map((v, idx) => ({
        data: {
          id: `${v.previousOutput.txHash}_${v.previousOutput.index}`,
          txHash: v.previousOutput.txHash,
          type: 'input',
          index: idx,
          capacity: v.capacity,
        }
      })),
      ...txData.inputs.map((v) => ({
        data: {
          id: `edge_${v.previousOutput.txHash}_${v.previousOutput.index}`,
          source: `${v.previousOutput.txHash}_${v.previousOutput.index}`,
          target: txData.txHash,
        },
        classes: txData.inputs.length > 1 ? 'rightward' : ''
      })),
      ...txData.outputs.map((v, idx) => ({
        data: {
          id: `${txData.txHash}_${idx}`,
          txHash: txData.txHash,
          type: 'output',
          index: idx,
          capacity: v.capacity,
        }
      })),
      ...txData.outputs.map((_, idx) => ({
        data: {
          id: `edge_${txData.txHash}_${idx}`,
          target: `${txData.txHash}_${idx}`,
          source: txData.txHash,
        },
        classes: txData.outputs.length > 1 ? 'leftward' : ''
      })),
      {
        data: { id: txData.txHash, type: 'tx', txHash: txData.txHash }
      }
    ],
    style: [ // the stylesheet for the graph
      {
        selector: 'node',
        style: {
          width: 200,
          height: 30,
          shape: 'roundrectangle',
          'border-width': 1,
          'border-color': '#ccc',
          'background-color': '#fff',
          'text-valign': 'center',
          content(node: NodeSingular) {
            const txHash = node?.data('txHash')
            const type = node?.data('type')
            const capacity = node?.data('capacity')
            switch (type) {
              case 'input':
                return ''
              case 'output':
                return BigInt(capacity).toString()
              case 'tx':
                return `txid:${truncateMiddle(txHash)}`
              default:
                return truncateMiddle(txHash)
            }
          },
          color: '#666'
        }
      },
      {
        selector: 'edge',
        style: {
          'width': 1,
          'line-color': '#ccc',
          'target-arrow-color': '#ccc',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'control-point-step-size': 10
        }
      },
      {
        "selector": "edge.leftward",
        "style": {
          "curve-style": "taxi",
          "taxi-direction": "horizontal",
          "taxi-turn": 60,
          "taxi-turn-min-distance": 5
        }
      },
      {
        "selector": "edge.rightward",
        "style": {
          "curve-style": "taxi",
          "taxi-direction": "rightward",
          "taxi-turn": 120,
          "taxi-turn-min-distance": 5
        }
      }
    ],
    layout: {
      name: 'grid',
      rows: gridRows,
      cols: 3,
      position(node: NodeSingular) {
        const data = node?.data()
        const type = data.type
        switch (type) {
          case 'input':
            return {
              row: txData.inputs.length > 1 ? data.index : (gridRows - 1) / 2,
              col: 0,
            }
        case 'output':
            return {
              row: txData.outputs.length > 1 ? data.index : (gridRows - 1) / 2,
              col: 2,
            }
        case 'tx':
          return {
            row: (gridRows - 1) / 2,
            col: 1,
          }
          default:
            return {
              row: 0,
              col: 0
            }
        }
      }
    }
  });
  return cy
}
