"""Run controlled synthetic evidence-removal/linkage experiments without servers."""
import argparse
import asyncio
from datetime import datetime, timezone
import json
from pathlib import Path

from backend.core.experiments import run_experiment


async def main_async(seeds):
    reports=[]
    for seed in seeds:
        report=await run_experiment(seed)
        reports.append(report.model_dump(mode='json'))
        for case in report.cases:
            assessments=', '.join(i.assessment for i in case.report.incidents) or 'no finding'
            print(f'Seed {seed}, {case.id}: {assessments}; {len(case.report.edges)} association(s)')
    return {'checked_at_utc':datetime.now(timezone.utc).isoformat(),
        'method':'Controlled synthetic variants, reanalyzed by real isolated workers; no web servers or live traffic.',
        'experiments':reports}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--seeds', type=int, nargs='+', default=[42,73,99])
    parser.add_argument('--output', type=Path, default=Path('.artifacts/evidence-experiments.json'))
    args=parser.parse_args()
    if not 1<=len(args.seeds)<=10 or any(not 0<=seed<=1_000_000 for seed in args.seeds):
        parser.error('Use 1–10 seeds between 0 and 1000000.')
    result=asyncio.run(main_async(args.seeds))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2)+'\n')
    print('Wrote:', args.output)


if __name__=='__main__':
    main()
