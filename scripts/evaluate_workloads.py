"""Independent larger synthetic controls; real workers, no web servers."""
import argparse
import asyncio
from datetime import datetime,timezone
import json
from pathlib import Path
import resource
from tempfile import TemporaryDirectory
from time import perf_counter

from backend.core.errors import AnalysisError
from backend.core.supervisor import run_analysis
from scripts.generate_samples import exchange,write_pcap


def healthy_rows(count):
    for i in range(count):
        yield from exchange(i*.003,client=f'192.0.2.{10+i%8}',server='198.51.100.20',
            sport=20000+i%30000,dport=443,sequence=100000+i*97,delay=.001)


def mixed_rows(background_count):
    yield from healthy_rows(background_count)
    for i in range(12):
        yield from exchange(1+i*.1,client='192.0.2.201',server='198.51.100.30',sport=40000+i,dport=5432,sequence=900000+i*100,rejected=True,delay=.001)
    for host in range(16):
        for port in range(16):
            number=host*16+port
            yield from exchange(1+number*.01,client='192.0.2.115',server=f'198.51.100.{100+host}',sport=45000+number,
                dport=1000+port,sequence=10000+number*100,rejected=True,delay=.001)


async def evaluate(sizes):
    cases=[]
    with TemporaryDirectory(prefix='causalpacket-workload-') as directory:
        for count in sizes:
            for mixed in (False,True):
                label=('mixed-' if mixed else 'healthy-')+str(count)
                path=Path(directory)/(label+'.pcap')
                generated=perf_counter()
                rows=list(mixed_rows(count) if mixed else healthy_rows(count))
                expected_packets=count*3+(536 if mixed else 0)
                assert len(rows)==expected_packets
                write_pcap(path,rows)
                generation_ms=(perf_counter()-generated)*1000
                del rows
                before=resource.getrusage(resource.RUSAGE_CHILDREN)
                started=perf_counter()
                try:
                    report=await run_analysis(path)
                except AnalysisError as error:
                    cases.append({'case':label,'packets_generated':expected_packets,'file_bytes':path.stat().st_size,
                        'status':'controlled_limit_or_error','error_code':error.code,'worker_wall_ms':round((perf_counter()-started)*1000,2)})
                    continue
                elapsed=(perf_counter()-started)*1000
                after=resource.getrusage(resource.RUSAGE_CHILDREN)
                expected={'TCP_CONNECTION_REFUSED','SCAN_PATTERN'} if mixed else set()
                actual={o.type for o in report.observations}
                correct=(actual==expected and len(report.incidents)==(2 if mixed else 0) and report.coverage.packets_seen==expected_packets and report.coverage.status=='complete')
                cases.append({'case':label,'packets_generated':expected_packets,'packets_examined':report.coverage.packets_seen,
                    'file_bytes':path.stat().st_size,'status':'pass' if correct else 'mismatch','coverage':report.coverage.status,
                    'observation_types':sorted(actual),'raw_observations':len(report.observations),'incidents':len(report.incidents),
                    'generation_ms':round(generation_ms,2),'worker_wall_ms':round(elapsed,2),
                    'worker_cpu_ms':round(((after.ru_utime+after.ru_stime)-(before.ru_utime+before.ru_stime))*1000,2),
                    'child_peak_rss_so_far_kib':after.ru_maxrss,
                    'retained_evidence_frames':len(report.evidence)})
    return {'checked_at_utc':datetime.now(timezone.utc).isoformat(),'synthetic_only':True,
        'method':'Deterministic packet construction independent of demonstration filenames; real isolated analysis workers; no browser/web server.',
        'limits':'Finite generated controls, not production accuracy. Child RSS is the cumulative maximum observed so far, not per-capture allocation. Timings exclude generation.',
        'cases':cases}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--connections',type=int,nargs='+',default=[1000,5000])
    parser.add_argument('--output',type=Path,default=Path('.artifacts/workload-evaluation.json'))
    args=parser.parse_args()
    if any(n<1 or n>18000 for n in args.connections):
        parser.error('Choose 1–18000 healthy background connections per case.')
    result=asyncio.run(evaluate(args.connections))
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(result,indent=2)+'\n')
    for case in result['cases']:
        print(case['status'].upper(),case['case'],case.get('packets_examined',0),'examined packets;',case.get('incidents','?'),'incidents;',case['worker_wall_ms'],'ms')
    print('Wrote:',args.output)
    if any(c['status']!='pass' for c in result['cases']):
        raise SystemExit(1)


if __name__=='__main__':
    main()
