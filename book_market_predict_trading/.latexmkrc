# fontspec needs XeLaTeX; pdflatex fails on this folder.
$pdf_mode = 5;
# LaTeX Workshop's default recipe passes -pdf, which overrides $pdf_mode;
# point the pdflatex slot at xelatex so that path still gets XeLaTeX.
$pdflatex = 'xelatex %O %S';
