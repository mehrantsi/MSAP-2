export interface ExampleProgram {
  name: string
  source: string
  expects: string
}

export const EXAMPLES: ExampleProgram[] = [
  {
    name: 'Hello',
    expects: 'Assemble + load, then type R 1000 in the terminal',
    source: `; prints via the MOS PUTS syscall
.equ SYS_PUTS, 0x016
.equ SYS_EXIT, 0x01C
.equ PTR, 0x1F00

.org 0x1000
        lda #<msg
        sta PTR
        lda #>msg
        sta PTR+1
        jsr SYS_PUTS
        jmp SYS_EXIT
msg:    .asciiz "HELLO FROM MSAP-2!\\n"
`,
  },
  {
    name: 'Echo',
    expects: 'R 1000 - echoes typed characters, ESC returns to MOS',
    source: `; echo the keyboard until ESC
.equ SYS_PUTC, 0x010
.equ SYS_GETC, 0x013
.equ SYS_EXIT, 0x01C

.org 0x1000
loop:   jsr SYS_GETC
        cmp #27
        jz done
        jsr SYS_PUTC
        jmp loop
done:   jmp SYS_EXIT
`,
  },
  {
    name: 'Shout',
    expects: 'R 1000 - reads a line, prints it uppercased',
    source: `; read a line with GETLN, print it uppercased
.equ SYS_PUTC, 0x010
.equ SYS_PUTS, 0x016
.equ SYS_GETLN, 0x019
.equ SYS_EXIT, 0x01C
.equ PTR, 0x1F00
.equ LINEBUF, 0x1F20

.org 0x1000
        lda #<prompt
        sta PTR
        lda #>prompt
        sta PTR+1
        jsr SYS_PUTS
        jsr SYS_GETLN
        ldx #0
up_l:   lda LINEBUF,x
        jz up_d
        cmp #97
        jnc up_p
        cmp #123
        jc up_p
        and #0xDF
up_p:   jsr SYS_PUTC
        inx
        jmp up_l
up_d:   lda #10
        jsr SYS_PUTC
        jmp SYS_EXIT
prompt: .asciiz "SAY SOMETHING: "
`,
  },
  {
    name: 'Ticks',
    expects: 'R 1000 - timer interrupt increments the 7-seg display; any key stops',
    source: `; timer interrupt demo: hooks the RAM interrupt vector, counts ticks on the display
.equ SYS_EXIT, 0x01C
.equ IRQVEC, 0x1F1A
.equ COUNT, 0x1EE0

.org 0x1000
        lda #<handler
        sta IRQVEC
        lda #>handler
        sta IRQVEC+1
        lda #0
        sta COUNT
        out #3
        lda #2
        out #4
        ei
wait:   in #1
        and #1
        jz wait
        in #0
        di
        lda #0
        out #4
        jmp SYS_EXIT

handler:
        pha
        lda COUNT
        add #1
        sta COUNT
        out #3
        pla
        rti
`,
  },
]
