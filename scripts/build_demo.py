"""Build a truthful demo from recorded UI footage and measured experiment slides.

The slides visualize recorded worker results, not a simulated browser session.
Requires local ffmpeg/ffprobe and the original raw walkthrough recording.
"""
import argparse
import json
from pathlib import Path
import subprocess
from tempfile import TemporaryDirectory


FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'


def run(command):
    subprocess.run(command,check=True,timeout=180)


def probe(path):
    return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries',
        'format=duration:stream=codec_type,width,height','-of','json',str(path)]))


def build(walkthrough, captions, results, output):
    walkthrough,captions,results,output=map(lambda value:Path(value).resolve(),(walkthrough,captions,results,output))
    if output.exists() or output==walkthrough:
        raise ValueError('Choose a new output path; existing source/video files are never overwritten.')
    metadata=probe(walkthrough)
    duration=float(metadata['format']['duration'])
    video=next(item for item in metadata['streams'] if item['codec_type']=='video')
    if not 90<=duration<=264 or (video['width'],video['height'])!=(1280,800):
        raise ValueError('This storyboard requires reviewed 1280x800 footage, 90–264 seconds long.')
    measured=json.loads(results.read_text())
    experiments=measured['experiments']
    if len(experiments)!=3 or any(len(item['cases'])!=10 for item in experiments):
        raise ValueError('Expected the measured 30-case/three-seed control set.')
    cases={item['id']:item for item in experiments[0]['cases']}
    for experiment in experiments:
        observed={item['id']:item for item in experiment['cases']}
        if [observed[f'scan-{n}']['assessments'] for n in (20,15,10,5,0)] != [['suspected_attack']]*3+[['unresolved']]*2:
            raise ValueError('Measured scan controls differ; review the storyboard before encoding.')
        if observed['healthy-diversity']['assessments'] or observed['gateway-linked']['association_edges']!=2 or observed['gateway-unlinked']['association_edges']!=0:
            raise ValueError('Measured negative/link controls differ; review before encoding.')
        for name in ('mixed-original','mixed-no-baseline'):
            if sorted(observed[name]['assessments'])!=['likely_fault','suspected_attack']:
                raise ValueError('The independent mixed findings were not retained.')
    output.parent.mkdir(parents=True,exist_ok=True)
    with TemporaryDirectory(prefix='causalpacket-demo-') as directory:
        folder=Path(directory)
        def encode(name, seconds, content):
            filters=[]
            for index,(message,x,y,size,color) in enumerate(content):
                text=folder/f'{name}-{index}.txt';text.write_text(message)
                filters.append(f'drawtext=fontfile={FONT}:textfile={text}:expansion=none:x={x}:y={y}:fontsize={size}:fontcolor={color}')
            target=folder/(name+'.mp4')
            run(['ffmpeg','-hide_banner','-loglevel','error','-f','lavfi','-i',f'color=c=0x070b14:s=1280x800:r=25:d={seconds}',
                '-vf',','.join(filters),'-c:v','libx264','-threads','2','-preset','fast','-crf','22','-pix_fmt','yuv420p','-an',str(target)])
            return target
        scan=[('RECORDED SYNTHETIC EXPERIMENT RESULTS',64,44,18,'0x5eead4'),
            ('What happens when replies disappear?',64,94,36,'white'),
            ('Same 20 probes. Each modified view was reanalyzed by the real worker.',64,156,21,'0xcbd5e1'),
            ('Observed reset replies',82,230,22,'0x94a3b8'),('Unknown outcomes',465,230,22,'0x94a3b8'),('Assessment',815,230,22,'0x94a3b8')]
        for index,n in enumerate((20,15,10,5,0)):
            case=cases[f'scan-{n}'];metrics=case['scan_metrics'][0]
            if metrics['attempts']!=20 or metrics['rejected']!=n:raise ValueError('Unexpected measured scan metrics.')
            verdict=case['assessments'][0];label='Suspected attack' if verdict=='suspected_attack' else 'Unresolved'
            scan.extend([(str(metrics['rejected']),130,290+index*58,30,'white'),(str(metrics['unknown']),535,290+index*58,30,'white'),
                (label,815,290+index*58,26,'0xfca5a5' if verdict=='suspected_attack' else '0xcbd5e1')])
        scan.extend([('Rule: at least 10 known outcomes and an 80% rejected-outcome share.',64,650,21,'0x94a3b8'),
            ('These are evidence-sensitivity controls, not calibrated attack probabilities.',64,706,20,'0x94a3b8')])
        controls=[('RECORDED RESULTS / THREE GENERATED ADDRESS SETS',64,44,18,'0x5eead4'),
            ('Challenge the explanation with controls.',64,94,36,'white'),
            ('30 controlled variants; no production accuracy claim.',64,158,22,'0xcbd5e1'),
            ('20 successful service connections',64,246,26,'white'),('No scan finding from port diversity alone.',64,291,22,'0x5eead4'),
            ('Remove only the earlier successful handshake',64,382,26,'white'),('Scan and independent service fault remain; the comparator disappears.',64,427,22,'0x5eead4'),
            ('Keep timing, remove the required next-hop MAC link',64,518,26,'white'),('Association edges: 2 to 0. ARP, DNS and TCP findings remain separate.',64,563,22,'0x5eead4'),
            ('Modified synthetic views. Original user captures are never altered.',64,704,21,'0x94a3b8')]
        closing=[('CAUSALPACKET / FAULT OR FOE?',64,92,22,'0x5eead4'),
            ('Follow the evidence. Compare explanations.',64,180,36,'white'),
            ('Run the included synthetic captures locally:',64,292,26,'0xcbd5e1'),
            ('./run.sh setup',90,370,30,'0x5eead4'),('./run.sh dev',90,425,30,'0x5eead4'),
            ('Original trackers. Explicit uncertainty. Exact packet references.',64,568,23,'0xcbd5e1'),
            ('IIITDM Kancheepuram / Network Track / 2026',64,712,21,'0x94a3b8')]
        slides=[encode('visibility',14,scan),encode('controls',16,controls),encode('closing',6,closing)]
        # Explicit ASS coordinates prevent enormous subtitles at the video's resolution.
        cues=captions.read_text().strip().split('\n\n')
        ass='''[Script Info]
ScriptType: v4.00+
PlayResX: 1280
PlayResY: 800
WrapStyle: 0
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,DejaVu Sans,22,&H00FFFFFF,&H00FFFFFF,&H70000000,&H70000000,0,0,0,0,100,100,0,0,3,1,0,2,32,32,16,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
        for cue in cues:
            lines=cue.splitlines();start,end=lines[1].split(' --> ')
            stamp=lambda value:value.replace(',','.')[:-1]
            ass+=f'Dialogue: 0,{stamp(start)},{stamp(end)},Default,,0,0,0,,'+r'\N'.join(lines[2:])+'\n'
        subtitle=folder/'captions.ass';subtitle.write_text(ass)
        segment=folder/'walkthrough.mp4'
        run(['ffmpeg','-hide_banner','-loglevel','error','-i',str(walkthrough),'-vf',f'ass={subtitle},setsar=1',
            '-c:v','libx264','-threads','2','-preset','fast','-crf','22','-pix_fmt','yuv420p','-an',str(segment)])
        listing=folder/'concat.txt';listing.write_text(''.join(f"file '{part}'\n" for part in [segment,*slides]))
        run(['ffmpeg','-hide_banner','-loglevel','error','-f','concat','-safe','0','-i',str(listing),'-c','copy','-movflags','+faststart',str(output)])
        final=probe(output)
        if not 120<=float(final['format']['duration'])<=300:raise ValueError('Final video is outside the required length.')
        run(['ffmpeg','-hide_banner','-loglevel','error','-i',str(output),'-f','null','-'])
        return final


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--walkthrough',type=Path,required=True)
    parser.add_argument('--captions',type=Path,default=Path('docs/demo.srt'))
    parser.add_argument('--results',type=Path,default=Path('docs/evidence-experiments.json'))
    parser.add_argument('--output',type=Path,default=Path('.artifacts/causalpacket-demo-final.mp4'))
    args=parser.parse_args()
    print(json.dumps(build(args.walkthrough,args.captions,args.results,args.output),indent=2))
